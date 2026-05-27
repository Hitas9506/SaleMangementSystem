import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { Router } from 'express';
import multer from 'multer';

import { ApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(new ApiError(422, 'INVALID_INPUT', 'Chỉ hỗ trợ image/jpeg hoặc image/png'));
      return;
    }

    cb(null, true);
  },
});

function safeExtension(file: Express.Multer.File): string {
  const byMime = file.mimetype === 'image/png' ? '.png' : '.jpg';
  const originalExt = extname(file.originalname).toLowerCase();
  return ['.jpg', '.jpeg', '.png'].includes(originalExt) ? originalExt : byMime;
}

async function triggerEmbeddingPipeline(imageUrl: string): Promise<void> {
  try {
    // Upload chỉ biết imageUrl, chưa biết productId. Sau khi product lưu image_url,
    // gọi POST /api/v1/products/:id/regenerate-embedding để upsert text_vector.
    console.log('Product image uploaded; embedding can be regenerated after product save:', imageUrl);
  } catch (error) {
    console.warn('Embedding pipeline failed:', error);
  }
}

uploadRouter.post('/product-image', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(422, 'INVALID_INPUT', 'Thiếu file ảnh');
    }

    const filePath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${safeExtension(req.file)}`;

    const { error } = await supabase.storage.from('product-images').upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

    if (error) {
      throw new ApiError(500, 'DB_ERROR', `Upload ảnh thất bại: ${error.message}`);
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    const imageUrl = data.publicUrl;

    res.status(201).json({ image_url: imageUrl });

    void triggerEmbeddingPipeline(imageUrl);
  } catch (error) {
    next(error);
  }
});
