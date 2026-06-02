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

type StoreSettingsRow = {
  id: string;
  storeName?: string;
  store_name?: string;
  bankName?: string | null;
  bank_name?: string | null;
  bankAccount?: string | null;
  bank_account?: string | null;
  accountHolderName?: string | null;
  account_holder_name?: string | null;
  defaultLowStockThreshold?: number;
  default_low_stock_threshold?: number;
  logoUrl?: string | null;
  logo_url?: string | null;
  createdAt?: Date | string;
  created_at?: Date | string;
  updatedAt?: Date | string;
  updated_at?: Date | string;
};

function settingsResponse(settings: StoreSettingsRow) {
  return {
    id: settings.id,
    store_name: settings.storeName ?? settings.store_name ?? 'Cửa hàng Vật tư Gia đình',
    bank_name: settings.bankName ?? settings.bank_name ?? null,
    bank_account: settings.bankAccount ?? settings.bank_account ?? null,
    account_holder_name: settings.accountHolderName ?? settings.account_holder_name ?? null,
    zalo_phone: null,
    zalo_notify_hour: 8,
    zalo_notify_enabled: false,
    default_low_stock_threshold: settings.defaultLowStockThreshold ?? settings.default_low_stock_threshold ?? 5,
    logo_url: settings.logoUrl ?? settings.logo_url ?? null,
    created_at: toIso(settings.createdAt ?? settings.created_at),
    updated_at: toIso(settings.updatedAt ?? settings.updated_at),
  };
}

async function getOrCreateSettingsRaw(): Promise<StoreSettingsRow> {
  const rows = await prisma.$queryRaw<StoreSettingsRow[]>`
    SELECT id, store_name, bank_name, bank_account, account_holder_name,
           default_low_stock_threshold, logo_url, created_at, updated_at
    FROM store_settings
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (rows[0]) return rows[0];

  const inserted = await prisma.$queryRaw<StoreSettingsRow[]>`
    INSERT INTO store_settings (store_name, default_low_stock_threshold)
    VALUES ('Cửa hàng Vật tư Gia đình', 5)
    RETURNING id, store_name, bank_name, bank_account, account_holder_name,
              default_low_stock_threshold, logo_url, created_at, updated_at
  `;

  return inserted[0];
}

async function getOrCreateSettings(): Promise<StoreSettingsRow> {
  try {
    const existing = await prisma.storeSetting.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing;

    return prisma.storeSetting.create({
      data: {
        storeName: 'Cửa hàng Vật tư Gia đình',
        defaultLowStockThreshold: 5,
      },
    });
  } catch (error) {
    console.warn('[SETTINGS_FALLBACK] Prisma storeSetting failed; using raw SQL fallback', error);
    return getOrCreateSettingsRaw();
  }
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
