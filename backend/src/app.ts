import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { hasPlaceholderDatabaseUrl } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requireAppKey } from './middleware/requireAppKey';
import { aiRouter } from './routes/ai';
import { categoriesRouter } from './routes/categories';
import { healthRouter } from './routes/health';
import { importLogsRouter } from './routes/importLogs';
import { ordersRouter } from './routes/orders';
import { productsRouter } from './routes/products';
import { returnsRouter } from './routes/returns';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';
import { suppliersRouter } from './routes/suppliers';
import { uploadRouter } from './routes/upload';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(healthRouter);

  const apiV1 = express.Router();
  apiV1.use(requireAppKey);
  apiV1.use((req, res, next) => {
    if (hasPlaceholderDatabaseUrl()) {
      res.status(503).json({
        error: 'CONFIG_REQUIRED',
        message: 'DATABASE_URL đang là placeholder. Hãy cấu hình Supabase DATABASE_URL thật trong backend/.env.',
      });
      return;
    }
    next();
  });
  apiV1.use('/products', productsRouter);
  apiV1.use('/categories', categoriesRouter);
  apiV1.use('/suppliers', suppliersRouter);
  apiV1.use('/settings', settingsRouter);
  apiV1.use('/import-logs', importLogsRouter);
  apiV1.use('/orders', ordersRouter);
  apiV1.use('/returns', returnsRouter);
  apiV1.use('/reports', reportsRouter);
  apiV1.use('/ai', aiRouter);
  apiV1.use('/upload', uploadRouter);

  app.use('/api/v1', apiV1);
  app.use(errorHandler);

  return app;
}
