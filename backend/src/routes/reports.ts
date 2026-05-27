import { Router } from 'express';

import { invalidInput } from '../lib/apiError';
import { prisma } from '../lib/prisma';
import { sendDailyZaloReport } from '../lib/zaloReport';
import { toIso, toNumber } from '../utils/format';
import { getLastImportPrices } from '../utils/importPrices';

export const reportsRouter = Router();

type Range = { start: Date; end: Date };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDateParam(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidInput('Ngày không hợp lệ');
  }

  return parsed;
}

function currentWeekRange(date: Date): Range {
  const day = date.getDay() || 7;
  const start = startOfDay(addDays(date, 1 - day));
  const end = endOfDay(addDays(start, 6));
  return { start, end };
}

function currentMonthRange(date: Date): Range {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { start, end };
}



async function summarizeOrders(range: Range) {
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: 'paid',
      orderDate: { gte: range.start, lte: range.end },
    },
    include: { items: true },
  });

  const productIds = [...new Set(orders.flatMap((order: any) => order.items.map((item: any) => item.productId)))] as string[];
  const importPrices = await getLastImportPrices(productIds);

  let revenue = 0;
  let grossProfit = 0;

  for (const order of orders as any[]) {
    revenue += toNumber(order.totalAmount) ?? 0;
    for (const item of order.items) {
      const unitPrice = toNumber(item.unitPrice) ?? 0;
      const lastImportPrice = importPrices.get(item.productId) ?? 0;
      grossProfit += item.quantity * (unitPrice - lastImportPrice);
    }
  }

  return { revenue, gross_profit: grossProfit, order_count: orders.length };
}

reportsRouter.get('/dashboard', async (req, res, next) => {
  try {
    const date = parseDateParam(req.query.date, new Date());
    const todayRange = { start: startOfDay(date), end: endOfDay(date) };
    const weekRange = currentWeekRange(date);
    const monthRange = currentMonthRange(date);

    const [today, thisWeek, thisMonth, lowStockAlerts, weekOrders] = await Promise.all([
      summarizeOrders(todayRange),
      summarizeOrders(weekRange),
      summarizeOrders(monthRange),
      prisma.product.findMany({
        where: { isActive: true, stockQuantity: { lte: prisma.product.fields.lowStockThreshold } },
        orderBy: { stockQuantity: 'asc' },
        take: 10,
      }),
      prisma.order.findMany({
        where: { paymentStatus: 'paid', orderDate: { gte: weekRange.start, lte: weekRange.end } },
        include: { items: { include: { product: true } } },
      }),
    ]);

    const topMap = new Map<string, { product_name: string; quantity_sold: number; revenue: number }>();
    for (const order of weekOrders as any[]) {
      for (const item of order.items) {
        const current = topMap.get(item.productId) ?? {
          product_name: item.product?.name ?? 'Unknown',
          quantity_sold: 0,
          revenue: 0,
        };
        current.quantity_sold += item.quantity;
        current.revenue += item.quantity * (toNumber(item.unitPrice) ?? 0);
        topMap.set(item.productId, current);
      }
    }

    res.json({
      today,
      this_week: { revenue: thisWeek.revenue, gross_profit: thisWeek.gross_profit },
      this_month: { revenue: thisMonth.revenue, gross_profit: thisMonth.gross_profit },
      top_products: [...topMap.values()].sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, 5),
      low_stock_alerts: (lowStockAlerts as any[]).map((product) => ({
        product_id: product.id,
        name: product.name,
        stock_quantity: product.stockQuantity,
        threshold: product.lowStockThreshold,
      })),
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get('/revenue', async (req, res, next) => {
  try {
    const fromDate = startOfDay(parseDateParam(req.query.from_date, addDays(new Date(), -30)));
    const toDate = endOfDay(parseDateParam(req.query.to_date, new Date()));
    const groupBy = typeof req.query.group_by === 'string' ? req.query.group_by : 'day';

    if (!['day', 'week', 'month'].includes(groupBy)) {
      throw invalidInput('group_by phải là day, week hoặc month');
    }

    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'paid', orderDate: { gte: fromDate, lte: toDate } },
      include: { items: true },
      orderBy: { orderDate: 'asc' },
    });

    const productIds = [...new Set((orders as any[]).flatMap((order) => order.items.map((item: any) => item.productId)))] as string[];
    const importPrices = await getLastImportPrices(productIds);
    const bucketMap = new Map<string, { period: string; revenue: number; profit: number; orders: Set<string> }>();

    for (const order of orders as any[]) {
      const date = new Date(order.orderDate);
      const period =
        groupBy === 'month'
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : groupBy === 'week'
            ? `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + 6) / 7)).padStart(2, '0')}`
            : date.toISOString().slice(0, 10);

      const bucket = bucketMap.get(period) ?? { period, revenue: 0, profit: 0, orders: new Set<string>() };
      bucket.revenue += toNumber(order.totalAmount) ?? 0;
      bucket.orders.add(order.id);

      for (const item of order.items) {
        const unitPrice = toNumber(item.unitPrice) ?? 0;
        const lastImportPrice = importPrices.get(item.productId) ?? 0;
        bucket.profit += item.quantity * (unitPrice - lastImportPrice);
      }

      bucketMap.set(period, bucket);
    }

    const chartData = [...bucketMap.values()].map((bucket) => ({
      period: bucket.period,
      revenue: bucket.revenue,
      profit: bucket.profit,
      orders: bucket.orders.size,
    }));

    res.json({
      summary: {
        total_revenue: chartData.reduce((sum, item) => sum + item.revenue, 0),
        total_profit: chartData.reduce((sum, item) => sum + item.profit, 0),
        total_orders: new Set((orders as any[]).map((order) => order.id)).size,
      },
      chart_data: chartData,
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get('/inventory', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ where: { isActive: true } });
    const productIds = (products as any[]).map((product) => product.id);
    const importPrices = await getLastImportPrices(productIds);

    const totalStockValue = (products as any[]).reduce((sum, product) => {
      return sum + product.stockQuantity * (importPrices.get(product.id) ?? 0);
    }, 0);

    const lowStock = (products as any[])
      .filter((product) => product.stockQuantity <= product.lowStockThreshold)
      .map((product) => ({
        product_id: product.id,
        name: product.name,
        stock_quantity: product.stockQuantity,
        threshold: product.lowStockThreshold,
      }));

    const since = addDays(new Date(), -30);
    const recentSales = await prisma.orderItem.findMany({
      where: { order: { paymentStatus: 'paid', orderDate: { gte: since } } },
      select: { productId: true },
      distinct: ['productId'],
    });
    const recentlySoldIds = new Set((recentSales as any[]).map((item) => item.productId));

    res.json({
      total_sku: products.length,
      total_stock_value: totalStockValue,
      low_stock: lowStock,
      slow_moving: (products as any[])
        .filter((product) => !recentlySoldIds.has(product.id))
        .map((product) => ({
          product_id: product.id,
          name: product.name,
          last_sold_date: null,
          days_no_sale: 30,
        })),
      generated_at: toIso(new Date()),
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post('/send-zalo', async (_req, res, next) => {
  try {
    const result = await sendDailyZaloReport();
    res.json(result);
  } catch (error) {
    next(error);
  }
});
