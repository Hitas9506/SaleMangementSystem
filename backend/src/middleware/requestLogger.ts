import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Simple request logger middleware
 * Logs request/response information for monitoring and debugging
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  req.startTime = Date.now();

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', req.requestId);

  // Log request
  console.log('[REQUEST]', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body?: any): Response {
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    console.log('[RESPONSE]', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return originalSend.call(this, body);
  };

  next();
}
