import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { supabase } from '../lib/supabase';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const startTime = Date.now();
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    dependencies: {},
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.dependencies.database = { status: 'healthy', responseTime: Date.now() - startTime };
  } catch (error) {
    health.status = 'unhealthy';
    health.dependencies.database = { status: 'unhealthy', error: (error as Error).message };
  }

  // Check Supabase storage connectivity
  try {
    const storageStart = Date.now();
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    health.dependencies.supabase = {
      status: 'healthy',
      responseTime: Date.now() - storageStart,
      buckets: data?.length || 0,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.dependencies.supabase = { status: 'unhealthy', error: (error as Error).message };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
