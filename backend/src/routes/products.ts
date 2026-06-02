import { Router } from 'express';
import { z } from 'zod';

import { invalidInput, notFound } from '../lib/apiError';
import { regenerateProductEmbedding } from '../lib/ai';
import { prisma } from '../lib/prisma';
import { parsePositiveInt, toIso, toNumber } from '../utils/format';

export const productsRouter = Router();

const productCreateSchema = z.object({
  name: z.string().trim().min(1),
  category_id: z.string().uuid().optional().nullable(),
  sku: z.string().trim().min(1).optional(),
  unit: z.string().trim().min(1),
  retail_price: z.coerce.number().nonnegative(),
  stock_quantity: z.coerce.number().int().nonnegative().default(0),
  low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
  technical_specs: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});

const productUpdateSchema = productCreateSchema.partial().omit({ stock_quantity: true });

function productResponse(product: any) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    retail_price: toNumber(product.retailPrice),
    stock_quantity: product.stockQuantity,
    low_stock_threshold: product.lowStockThreshold,
    technical_specs: product.technicalSpecs,
    image_url: product.imageUrl,
    is_active: product.isActive,
    created_at: toIso(product.createdAt),
    updated_at: toIso(product.updatedAt),
    category: product.category
      ? { id: product.category.id, name: product.category.name, icon: product.category.icon }
      : null,
  };
}

async function generateSku(categoryId?: string | null): Promise<string> {
  let prefix = 'SP';

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw invalidInput('Ngành hàng không tồn tại');
    }

    prefix = category.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((word: string) => word[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'SP';
  }

  const existingCount = await prisma.product.count({ where: { sku: { startsWith: `${prefix}-` } } });
  return `${prefix}-${String(existingCount + 1).padStart(3, '0')}`;
}

productsRouter.get('/compare', async (req, res, next) => {
  try {
    const ids = String(req.query.ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length < 2 || ids.length > 3) {
      throw invalidInput('Chỉ so sánh từ 2 đến 3 sản phẩm');
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      include: {
        category: true,
        importLogs: { orderBy: { importDate: 'desc' }, take: 1 },
      },
    });

    if (products.length !== ids.length) {
      throw notFound('Một hoặc nhiều sản phẩm không tồn tại');
    }

    res.json({
      products: products.map((product: any) => ({
        ...productResponse(product),
        last_import_price: toNumber(product.importLogs[0]?.importPrice),
      })),
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.get('/', async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoryId = typeof req.query.category_id === 'string' ? req.query.category_id : undefined;
    const lowStock = req.query.low_stock === 'true';

    const where: any = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(lowStock ? { stockQuantity: { lte: prisma.product.fields.lowStockThreshold } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ data: data.map(productResponse), total, page, limit });
  } catch (error) {
    next(error);
  }
});

productsRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        importLogs: { include: { supplier: true }, orderBy: { importDate: 'desc' }, take: 1 },
      },
    });

    if (!product || !product.isActive) {
      throw notFound('Sản phẩm không tồn tại');
    }

    const lastImport = product.importLogs[0];
    res.json({
      ...productResponse(product),
      last_import_price: toNumber(lastImport?.importPrice),
      last_import_date: toIso(lastImport?.importDate),
      supplier: lastImport?.supplier
        ? { id: lastImport.supplier.id, name: lastImport.supplier.name, phone: lastImport.supplier.phone }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.post('/', async (req, res, next) => {
  try {
    const input = productCreateSchema.parse(req.body);
    const sku = input.sku ?? (await generateSku(input.category_id));

    const product = await prisma.product.create({
      data: {
        name: input.name,
        categoryId: input.category_id ?? null,
        sku,
        unit: input.unit,
        retailPrice: input.retail_price,
        stockQuantity: input.stock_quantity,
        lowStockThreshold: input.low_stock_threshold,
        technicalSpecs: input.technical_specs ?? null,
        imageUrl: input.image_url ?? null,
      },
      include: { category: true },
    });

    res.status(201).json(productResponse(product));
  } catch (error) {
    next(error);
  }
});

productsRouter.put('/:id', async (req, res, next) => {
  try {
    const input = productUpdateSchema.parse(req.body);

    const exists = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!exists || !exists.isActive) {
      throw notFound('Sản phẩm không tồn tại');
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category_id !== undefined ? { categoryId: input.category_id } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.retail_price !== undefined ? { retailPrice: input.retail_price } : {}),
        ...(input.low_stock_threshold !== undefined ? { lowStockThreshold: input.low_stock_threshold } : {}),
        ...(input.technical_specs !== undefined ? { technicalSpecs: input.technical_specs } : {}),
        ...(input.image_url !== undefined ? { imageUrl: input.image_url } : {}),
      },
      include: { category: true },
    });

    res.json(productResponse(product));
  } catch (error) {
    next(error);
  }
});

productsRouter.delete('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || !product.isActive) {
      throw notFound('Sản phẩm không tồn tại');
    }

    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

productsRouter.post('/:id/regenerate-embedding', async (req, res, next) => {
  try {
    const result = await regenerateProductEmbedding(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
