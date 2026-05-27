import { Router } from 'express';
import { z } from 'zod';

import { describeProductImage, embedText, searchSimilarProducts } from '../lib/ai';

export const aiRouter = Router();

const aiSearchSchema = z.object({
  image_base64: z.string().min(100, 'image_base64 quá ngắn'),
  mime_type: z.enum(['image/jpeg', 'image/png']).default('image/jpeg'),
});

aiRouter.post('/search-by-image', async (req, res, next) => {
  try {
    const input = aiSearchSchema.parse(req.body);
    const description = await describeProductImage(input.image_base64, input.mime_type);
    const queryText = [description.description, description.productType, ...description.specs].filter(Boolean).join(' ');
    const embedding = await embedText(queryText);
    const results = await searchSimilarProducts(embedding, queryText, 10);

    res.json({
      ai_description: description.description,
      product_type: description.productType,
      specs: description.specs,
      results,
    });
  } catch (error) {
    next(error);
  }
});
