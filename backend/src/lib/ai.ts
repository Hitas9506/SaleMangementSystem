import { ApiError } from './apiError';
import { env } from '../config/env';
import { prisma } from './prisma';
import { toNumber } from '../utils/format';

const VISION_MODEL = 'gemini-1.5-flash';
const EMBEDDING_MODEL = 'text-embedding-004';
const AI_TIMEOUT_MS = 15000;

export interface AiImageDescription {
  description: string;
  productType: string;
  specs: string[];
}

export interface AiSearchResult {
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  similarity: number;
  retail_price: number;
  stock_quantity: number;
  image_url: string | null;
}

let aiClient: any;

async function getAiClient() {
  if (!aiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return aiClient;
}

function safeNumber(value: unknown): number {
  return toNumber(value as string | number | { toNumber: () => number } | null | undefined) ?? 0;
}


function withTimeout<T>(promise: Promise<T>, timeoutMs = AI_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new ApiError(503, 'AI_UNAVAILABLE', 'AI xử lý quá thời gian')), timeoutMs);
    }),
  ]);
}

function parseJsonObject(text: string): AiImageDescription {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { description: text.trim(), productType: '', specs: [] };
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<AiImageDescription>;
    return {
      description: String(parsed.description ?? text).trim(),
      productType: String(parsed.productType ?? '').trim(),
      specs: Array.isArray(parsed.specs) ? parsed.specs.map(String).filter(Boolean) : [],
    };
  } catch {
    return { description: text.trim(), productType: '', specs: [] };
  }
}

export async function describeProductImage(imageBase64: string, mimeType: 'image/jpeg' | 'image/png'): Promise<AiImageDescription> {
  const ai = await getAiClient();
  const response = await withTimeout(ai.models.generateContent({
    model: VISION_MODEL,
    contents: [{
      role: 'user',
      parts: [
        {
          text: 'Bạn là trợ lý nhận diện vật tư gia đình/cửa hàng kim khí. Hãy mô tả ảnh và trả JSON đúng dạng {"description":"...","productType":"...","specs":["..."]}. Chỉ trả JSON.',
        },
        { inlineData: { mimeType, data: imageBase64 } },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  } as any));

  const text = String((response as any).text ?? '');
  return parseJsonObject(text);
}

export async function embedText(text: string): Promise<number[]> {
  const ai = await getAiClient();
  const response = await withTimeout(ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  } as any));

  const values = (response as any).embeddings?.[0]?.values ?? (response as any).embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new ApiError(503, 'AI_UNAVAILABLE', 'Không tạo được embedding từ Gemini');
  }

  return values.map(Number);
}

function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number.isFinite(value) ? value.toFixed(8) : '0').join(',')}]`;
}

export async function searchSimilarProducts(embedding: number[], fallbackQuery: string, limit = 10): Promise<AiSearchResult[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      product_id: string;
      product_name: string;
      sku: string;
      unit: string;
      distance: number;
      retail_price: unknown;
      stock_quantity: number;
      image_url: string | null;
    }>>(
      `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.unit,
        (pe.text_vector <=> $1::vector) AS distance,
        p.retail_price,
        p.stock_quantity,
        p.image_url
      FROM product_embeddings pe
      JOIN products p ON p.id = pe.product_id
      WHERE p.is_active = true AND pe.text_vector IS NOT NULL
      ORDER BY pe.text_vector <=> $1::vector
      LIMIT $2
      `,
      vectorLiteral(embedding),
      limit,
    );

    if (rows.length > 0) {
      return rows.map((row: any) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku,
        unit: row.unit,
        similarity: Math.max(0, Math.min(1, 1 - Number(row.distance))),
        retail_price: safeNumber(row.retail_price),
        stock_quantity: row.stock_quantity,
        image_url: row.image_url,
      }));
    }
  } catch (error) {
    console.warn('Vector search unavailable, falling back to text search:', error);
  }

  return fallbackProductSearch(fallbackQuery, limit);
}

async function fallbackProductSearch(query: string, limit: number): Promise<AiSearchResult[]> {
  const tokens = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length >= 2)
    .slice(0, 8);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(tokens.length
        ? {
            OR: tokens.flatMap((token) => ([
              { name: { contains: token, mode: 'insensitive' as const } },
              { sku: { contains: token, mode: 'insensitive' as const } },
              { technicalSpecs: { contains: token, mode: 'insensitive' as const } },
            ])),
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return products.map((product: any, index: number) => ({
    product_id: product.id,
    product_name: product.name,
    sku: product.sku,
    unit: product.unit,
    similarity: Math.max(0.35, 0.75 - index * 0.05),
    retail_price: safeNumber(product.retailPrice),
    stock_quantity: product.stockQuantity,
    image_url: product.imageUrl,
  }));
}

function productEmbeddingText(product: {
  name: string;
  sku: string;
  unit: string;
  technicalSpecs: string | null;
  category?: { name: string } | null;
}): string {
  return [
    product.name,
    product.sku,
    product.unit,
    product.category?.name,
    product.technicalSpecs,
  ].filter(Boolean).join(' ');
}

export async function regenerateProductEmbedding(productId: string): Promise<{ product_id: string; updated: boolean }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product || !product.isActive) {
    throw new ApiError(404, 'NOT_FOUND', 'Sản phẩm không tồn tại');
  }

  const embedding = await embedText(productEmbeddingText(product));
  const vector = vectorLiteral(embedding);

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO product_embeddings (id, product_id, text_vector, updated_at)
    VALUES (gen_random_uuid(), $1::uuid, $2::vector, NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET text_vector = EXCLUDED.text_vector, updated_at = NOW()
    `,
    product.id,
    vector,
  );

  return { product_id: product.id, updated: true };
}

export async function regenerateProductEmbeddingSafe(productId: string): Promise<void> {
  try {
    await regenerateProductEmbedding(productId);
  } catch (error) {
    console.warn('Embedding regeneration failed:', { productId, error });
  }
}
