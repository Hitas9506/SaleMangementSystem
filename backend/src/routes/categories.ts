import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';

export const categoriesRouter = Router();

const categorySchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().max(50).optional().nullable(),
});

categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });

    res.json({
      data: categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        product_count: category._count.products,
      })),
    });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post('/', async (req, res, next) => {
  try {
    const input = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data: input });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});
