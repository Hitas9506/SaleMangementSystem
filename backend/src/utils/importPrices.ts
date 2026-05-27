import { prisma } from '../lib/prisma';
import { toNumber } from './format';

/**
 * Efficiently fetch the last import price for multiple products in a single query.
 * Uses PostgreSQL DISTINCT ON to avoid N+1 query problem.
 * 
 * @param productIds Array of product IDs to fetch import prices for
 * @returns Map of product ID to last import price (0 if no import found)
 */
export async function getLastImportPrices(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) {
    return new Map();
  }

  // Use DISTINCT ON to get the most recent import log for each product
  // This is much more efficient than N separate queries
  const lastImports = await prisma.$queryRawUnsafe<Array<{
    product_id: string;
    import_price: unknown;
  }>>(
    `
    SELECT DISTINCT ON (product_id) 
      product_id,
      import_price
    FROM import_logs
    WHERE product_id = ANY($1::uuid[])
    ORDER BY product_id, import_date DESC
    `,
    productIds,
  );

  const priceMap = new Map<string, number>();
  
  // Initialize all products with 0 (in case some have no imports)
  for (const productId of productIds) {
    priceMap.set(productId, 0);
  }

  // Update with actual import prices
  for (const row of lastImports) {
    priceMap.set(row.product_id, toNumber(row.import_price as any) ?? 0);
  }

  return priceMap;
}
