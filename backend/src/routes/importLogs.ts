import { Router } from 'express';
import { z } from 'zod';

import { invalidInput, notFound } from '../lib/apiError';
import { prisma } from '../lib/prisma';
import { toIso, toNumber } from '../utils/format';

export const importLogsRouter = Router();

const importLogCreateSchema = z.object({
  product_id: z.string().uuid(),
  supplier_id: z.string().uuid().optional().nullable(),
  import_price: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().positive(),
  import_date: z.coerce.date().optional(),
  note: z.string().optional().nullable(),
});

function importLogResponse(log: any) {
  return {
    id: log.id,
    product_id: log.productId,
    supplier_id: log.supplierId,
    import_price: toNumber(log.importPrice),
    quantity: log.quantity,
    note: log.note,
    import_date: toIso(log.importDate),
    created_at: toIso(log.createdAt),
    product: log.product
      ? { id: log.product.id, name: log.product.name, sku: log.product.sku, unit: log.product.unit }
      : undefined,
    supplier: log.supplier ? { id: log.supplier.id, name: log.supplier.name, phone: log.supplier.phone } : null,
  };
}

importLogsRouter.get('/', async (req, res, next) => {
  try {
    const productId = typeof req.query.product_id === 'string' ? req.query.product_id : undefined;
    const supplierId = typeof req.query.supplier_id === 'string' ? req.query.supplier_id : undefined;
    const fromDate = typeof req.query.from_date === 'string' ? new Date(req.query.from_date) : undefined;
    const toDate = typeof req.query.to_date === 'string' ? new Date(req.query.to_date) : undefined;

    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
      throw invalidInput('from_date/to_date không hợp lệ');
    }

    const logs = await prisma.importLog.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...((fromDate || toDate)
          ? {
              importDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      include: { product: true, supplier: true },
      orderBy: { importDate: 'desc' },
    });

    res.json({ data: logs.map((log: any) => importLogResponse(log)) });
  } catch (error) {
    next(error);
  }
});

importLogsRouter.post('/', async (req, res, next) => {
  try {
    const input = importLogCreateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx: any) => {
      const product = await tx.product.findUnique({ where: { id: input.product_id } });
      if (!product || !product.isActive) {
        throw notFound('Sản phẩm không tồn tại');
      }

      if (input.supplier_id) {
        const supplier = await tx.supplier.findUnique({ where: { id: input.supplier_id } });
        if (!supplier) {
          throw invalidInput('Nhà cung cấp không tồn tại');
        }
      }

      const importLog = await tx.importLog.create({
        data: {
          productId: input.product_id,
          supplierId: input.supplier_id ?? null,
          importPrice: input.import_price,
          quantity: input.quantity,
          importDate: input.import_date ?? new Date(),
          note: input.note ?? null,
        },
        include: { product: true, supplier: true },
      });

      const updatedProduct = await tx.product.update({
        where: { id: input.product_id },
        data: { stockQuantity: { increment: input.quantity } },
      });

      return { importLog, updatedStock: updatedProduct.stockQuantity };
    });

    res.status(201).json({
      import_log: importLogResponse(result.importLog),
      updated_stock: result.updatedStock,
    });
  } catch (error) {
    next(error);
  }
});
