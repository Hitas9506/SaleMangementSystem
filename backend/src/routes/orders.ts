import { Router } from 'express';
import { z } from 'zod';

import { ApiError, conflict, invalidInput, notFound } from '../lib/apiError';
import { prisma } from '../lib/prisma';
import { parsePositiveInt, toIso, toNumber } from '../utils/format';

export const ordersRouter = Router();

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().nonnegative(),
});

const orderCreateSchema = z.object({
  payment_method: z.enum(['cash', 'qr']).default('cash'),
  paid_amount: z.coerce.number().nonnegative().optional().nullable(),
  payment_status: z.enum(['pending', 'paid', 'cancelled']).optional(),
  note: z.string().optional().nullable(),
  order_date: z.coerce.date().optional(),
  items: z.array(orderItemSchema).min(1),
});

function orderListResponse(order: any) {
  return {
    id: order.id,
    total_amount: toNumber(order.totalAmount),
    paid_amount: toNumber(order.paidAmount),
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    order_date: toIso(order.orderDate),
    created_at: toIso(order.createdAt),
    items_count: order._count?.items ?? order.items?.length ?? 0,
    note: order.note,
  };
}

function orderDetailResponse(order: any) {
  return {
    id: order.id,
    total_amount: toNumber(order.totalAmount),
    paid_amount: toNumber(order.paidAmount),
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    note: order.note,
    order_date: toIso(order.orderDate),
    created_at: toIso(order.createdAt),
    items: order.items.map((item: any) => ({
      id: item.id,
      product_id: item.productId,
      product_name: item.product?.name,
      sku: item.product?.sku,
      unit: item.product?.unit,
      quantity: item.quantity,
      unit_price: toNumber(item.unitPrice),
      subtotal: toNumber(item.subtotal),
    })),
  };
}

ordersRouter.get('/', async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;
    const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;
    const fromDate = typeof req.query.from_date === 'string' ? new Date(req.query.from_date) : undefined;
    const toDate = typeof req.query.to_date === 'string' ? new Date(req.query.to_date) : undefined;

    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
      throw invalidInput('from_date/to_date không hợp lệ');
    }

    // Validate status is a valid PaymentStatus enum value
    const validStatuses = ['pending', 'paid', 'cancelled'];
    const status = statusParam && validStatuses.includes(statusParam) ? statusParam : undefined;

    const where = {
      ...(status ? { paymentStatus: status as 'pending' | 'paid' | 'cancelled' } : {}),
      ...((fromDate || toDate)
        ? {
            orderDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { _count: { select: { items: true } } },
        orderBy: { orderDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ data: orders.map((order: any) => orderListResponse(order)), total, page, limit });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw notFound('Hóa đơn không tồn tại');
    }

    res.json(orderDetailResponse(order));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post('/', async (req, res, next) => {
  try {
    const input = orderCreateSchema.parse(req.body);
    const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const paidAmount = input.paid_amount ?? null;
    const paymentStatus = input.payment_status ?? (input.payment_method === 'cash' ? 'paid' : 'pending');

    if (input.payment_method === 'cash' && (paidAmount === null || paidAmount < totalAmount)) {
      throw invalidInput('Tiền khách đưa phải lớn hơn hoặc bằng tổng tiền');
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const order = await tx.order.create({
        data: {
          totalAmount,
          paidAmount,
          paymentMethod: input.payment_method,
          paymentStatus,
          note: input.note ?? null,
          orderDate: input.order_date ?? new Date(),
        },
      });

      for (const item of input.items) {
        const product = await tx.product.findUnique({ where: { id: item.product_id } });
        if (!product || !product.isActive) {
          throw notFound('Sản phẩm không tồn tại');
        }

        if (product.stockQuantity < item.quantity) {
          throw conflict(
            'INSUFFICIENT_STOCK',
            `Sản phẩm '${product.name}' chỉ còn ${product.stockQuantity} ${product.unit}`,
          );
        }

        const updateResult = await tx.product.updateMany({
          where: { id: item.product_id, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        if (updateResult.count !== 1) {
          throw conflict(
            'INSUFFICIENT_STOCK',
            `Sản phẩm '${product.name}' không đủ tồn kho để bán`,
          );
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.quantity * item.unit_price,
          },
        });
      }

      return order;
    });

    res.status(201).json({
      id: result.id,
      total_amount: toNumber(result.totalAmount),
      change_amount: input.payment_method === 'cash' && paidAmount !== null ? paidAmount - totalAmount : null,
      payment_status: result.paymentStatus,
    });
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const order = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.order.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });

      if (!existing) {
        throw notFound('Hóa đơn không tồn tại');
      }

      if (existing.paymentStatus !== 'pending') {
        throw new ApiError(409, 'INVALID_STATE', 'Chỉ hủy được hóa đơn đang pending');
      }

      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id: existing.id },
        data: { paymentStatus: 'cancelled' },
        include: { items: { include: { product: true } } },
      });
    });

    res.json(orderDetailResponse(order));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post('/:id/qr-confirm', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      throw notFound('Hóa đơn không tồn tại');
    }

    if (order.paymentStatus !== 'pending') {
      throw new ApiError(409, 'INVALID_STATE', 'Chỉ xác nhận QR cho hóa đơn pending');
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { paymentStatus: 'paid' },
      include: { items: { include: { product: true } } },
    });

    res.json(orderDetailResponse(updated));
  } catch (error) {
    next(error);
  }
});
