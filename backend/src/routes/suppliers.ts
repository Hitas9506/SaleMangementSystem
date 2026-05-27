import { Router } from 'express';
import { z } from 'zod';

import { notFound } from '../lib/apiError';
import { prisma } from '../lib/prisma';

export const suppliersRouter = Router();

const supplierCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional().nullable(),
  note: z.string().optional().nullable(),
});

const supplierUpdateSchema = supplierCreateSchema.partial();

suppliersRouter.get('/', async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: suppliers });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.post('/', async (req, res, next) => {
  try {
    const input = supplierCreateSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data: input });
    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

suppliersRouter.put('/:id', async (req, res, next) => {
  try {
    const input = supplierUpdateSchema.parse(req.body);
    const exists = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!exists) {
      throw notFound('Nhà cung cấp không tồn tại');
    }

    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: input });
    res.json(supplier);
  } catch (error) {
    next(error);
  }
});
