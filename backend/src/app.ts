import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { hasPlaceholderDatabaseUrl } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
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

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding
  }));

  // CORS configuration based on environment
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : process.env.NODE_ENV === 'production'
    ? ['https://salemangementsystem-production.up.railway.app']
    : ['http://localhost:3000', 'http://localhost:8081', 'http://127.0.0.1:3000', 'http://127.0.0.1:8081'];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    exposedHeaders: ['X-App-Key', 'X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    allowedHeaders: ['Content-Type', 'X-App-Key'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging and rate limiting
  app.use(requestLogger);
  app.use(apiRateLimiter);

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
