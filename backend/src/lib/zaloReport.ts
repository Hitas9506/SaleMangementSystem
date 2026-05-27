import axios from 'axios';

import { env } from '../config/env';
import { prisma } from './prisma';
import { toNumber } from '../utils/format';
import { getLastImportPrices } from '../utils/importPrices';

type DayRange = { start: Date; end: Date };

export interface ZaloReportResult {
  sent: boolean;
  mocked: boolean;
  recipient: string | null;
  message: string;
}

function dayRange(date = new Date()): DayRange {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

async function buildDailyReportMessage(date = new Date()): Promise<string> {
  const range = dayRange(date);
  const orders = await prisma.order.findMany({
    where: { paymentStatus: 'paid', orderDate: { gte: range.start, lte: range.end } },
    include: { items: { include: { product: true } } },
    orderBy: { orderDate: 'asc' },
  });

  const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.productId)))];
  const importPrices = await getLastImportPrices(productIds);

  let revenue = 0;
  let grossProfit = 0;
  const topMap = new Map<string, { name: string; qty: number }>();

  for (const order of orders) {
    revenue += toNumber(order.totalAmount) ?? 0;
    for (const item of order.items) {
      const unitPrice = toNumber(item.unitPrice) ?? 0;
      const importPrice = importPrices.get(item.productId) ?? 0;
      grossProfit += item.quantity * (unitPrice - importPrice);
      const current = topMap.get(item.productId) ?? { name: item.product?.name ?? 'Sản phẩm', qty: 0 };
      current.qty += item.quantity;
      topMap.set(item.productId, current);
    }
  }

  const topProducts = [...topMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.name}: ${item.qty}`)
    .join('\n') || 'Chưa có sản phẩm bán ra.';

  return [
    'Báo cáo VTShop hôm nay',
    `Ngày: ${date.toLocaleDateString('vi-VN')}`,
    `Doanh thu: ${revenue.toLocaleString('vi-VN')}đ`,
    `Lợi nhuận gộp: ${grossProfit.toLocaleString('vi-VN')}đ`,
    `Số hóa đơn: ${orders.length}`,
    'Top sản phẩm:',
    topProducts,
  ].join('\n');
}

async function getReportRecipient(): Promise<string | null> {
  const setting = await prisma.storeSetting.findFirst({ orderBy: { createdAt: 'asc' } });
  return setting?.zaloPhone || env.ZALO_RECIPIENT_PHONE || null;
}

export async function sendDailyZaloReport(date = new Date()): Promise<ZaloReportResult> {
  const [recipient, message] = await Promise.all([getReportRecipient(), buildDailyReportMessage(date)]);

  if (!recipient) {
    return { sent: false, mocked: true, recipient: null, message };
  }

  if (!env.ZALO_OA_ACCESS_TOKEN || env.ZALO_OA_ACCESS_TOKEN.includes('...') || env.ZALO_OA_ACCESS_TOKEN === 'mock') {
    console.log('[ZALO MOCK]', { recipient, message });
    return { sent: true, mocked: true, recipient, message };
  }

  await axios.post(
    'https://openapi.zalo.me/v3.0/oa/message/cs',
    {
      recipient: { user_id: recipient },
      message: { text: message },
    },
    {
      headers: {
        access_token: env.ZALO_OA_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    },
  );

  return { sent: true, mocked: false, recipient, message };
}

export async function shouldSendZaloReportAt(date = new Date()): Promise<boolean> {
  const setting = await prisma.storeSetting.findFirst({ orderBy: { createdAt: 'asc' } });
  if (setting && !setting.zaloNotifyEnabled) return false;
  const hour = setting?.zaloNotifyHour ?? 21;
  return date.getHours() === hour;
}
