import { Router } from 'express';
import { z } from 'zod';

import { ApiError, invalidInput, notFound } from '../lib/apiError';
import { prisma } from '../lib/prisma';
import { toIso, toNumber } from '../utils/format';

export const returnsRouter = Router();

const returnItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().nonnegative(),
});

const returnCreateSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.string().optional().nullable(),
  refund_amount: z.coerce.number().nonnegative().optional().nullable(),
  return_date: z.coerce.date().optional(),
  items: z.array(returnItemSchema).min(1),
});

function returnResponse(returnRecord: any) {
  return {
    id: returnRecord.id,
    order_id: returnRecord.orderId,
    reason: returnRecord.reason,
    refund_amount: toNumber(returnRecord.refundAmount),
    return_date: toIso(returnRecord.returnDate),
    created_at: toIso(returnRecord.createdAt),
    items: returnRecord.items.map((item: any) => ({
      id: item.id,
      product_id: item.productId,
      product_name: item.product?.name,
      sku: item.product?.sku,
      quantity: item.quantity,
      unit_price: toNumber(item.unitPrice),
    })),
  };
}

returnsRouter.post('/', async (req, res, next) => {
  try {
    const input = returnCreateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: input.order_id },
        include: { items: { include: { product: true } } },
      });

      if (!order) {
        throw notFound('Hóa đơn không tồn tại');
      }

      if (order.paymentStatus === 'cancelled') {
        throw new ApiError(400, 'INVALID_STATE', 'Không thể hoàn trả hóa đơn đã hủy');
      }

      if (order.paymentStatus === 'returned') {
        throw new ApiError(400, 'INVALID_STATE', 'Hóa đơn đã được hoàn trả');
      }

      const purchasedByProduct = new Map<string, { quantity: number; unitPrice: number }>();
      for (const item of order.items) {
        const current = purchasedByProduct.get(item.productId);
        const unitPrice = toNumber(item.unitPrice) ?? 0;
        purchasedByProduct.set(item.productId, {
          quantity: (current?.quantity ?? 0) + item.quantity,
          unitPrice,
        });
      }

      for (const item of input.items) {
        const purchased = purchasedByProduct.get(item.product_id);
        if (!purchased) {
          throw invalidInput('Sản phẩm hoàn trả không thuộc hóa đơn gốc');
        }

        if (item.quantity > purchased.quantity) {
          throw invalidInput('Số lượng hoàn trả không được vượt quá số lượng đã mua');
        }
      }

      const refundAmount =
        input.refund_amount ?? input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

      const createdReturn = await tx.return.create({
        data: {
          orderId: input.order_id,
          reason: input.reason ?? null,
          refundAmount,
          returnDate: input.return_date ?? new Date(),
          items: {
            create: input.items.map((item) => ({
              productId: item.product_id,
              quantity: item.quantity,
              unitPrice: item.unit_price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of input.items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: input.order_id },
        data: { paymentStatus: 'returned' },
      });

      return createdReturn;
    });

    res.status(201).json(returnResponse(result));
  } catch (error) {
    next(error);
  }
});
