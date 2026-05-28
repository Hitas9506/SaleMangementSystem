import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { toIso } from '../utils/format';

export const settingsRouter = Router();

const settingsUpdateSchema = z.object({
  store_name: z.string().trim().min(1).optional(),
  bank_name: z.string().trim().optional().nullable(),
  bank_account: z.string().trim().optional().nullable(),
  account_holder_name: z.string().trim().optional().nullable(),
  default_low_stock_threshold: z.coerce.number().int().nonnegative().optional(),
  logo_url: z.string().url().optional().nullable(),
});

function settingsResponse(settings: any) {
  return {
    id: settings.id,
    store_name: settings.storeName,
    bank_name: settings.bankName,
    bank_account: settings.bankAccount,
    account_holder_name: settings.accountHolderName,
    default_low_stock_threshold: settings.defaultLowStockThreshold,
    logo_url: settings.logoUrl,
    created_at: toIso(settings.createdAt),
    updated_at: toIso(settings.updatedAt),
  };
}

async function getOrCreateSettings() {
  const existing = await prisma.storeSetting.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) {
    return existing;
  }

  return prisma.storeSetting.create({
    data: {
      storeName: 'Cửa hàng Vật tư Gia đình',
      defaultLowStockThreshold: 5,
    },
  });
}

settingsRouter.get('/', async (_req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settingsResponse(settings));
  } catch (error) {
    next(error);
  }
});

settingsRouter.put('/', async (req, res, next) => {
  try {
    const input = settingsUpdateSchema.parse(req.body);
    const settings = await getOrCreateSettings();
    const updated = await prisma.storeSetting.update({
      where: { id: settings.id },
      data: {
        ...(input.store_name !== undefined ? { storeName: input.store_name } : {}),
        ...(input.bank_name !== undefined ? { bankName: input.bank_name } : {}),
        ...(input.bank_account !== undefined ? { bankAccount: input.bank_account } : {}),
        ...(input.account_holder_name !== undefined ? { accountHolderName: input.account_holder_name } : {}),
        ...(input.default_low_stock_threshold !== undefined
          ? { defaultLowStockThreshold: input.default_low_stock_threshold }
          : {}),
        ...(input.logo_url !== undefined ? { logoUrl: input.logo_url } : {}),
      },
    });

    res.json(settingsResponse(updated));
  } catch (error) {
    next(error);
  }
});
