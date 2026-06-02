import type { Request, Response, NextFunction } from 'express';

/**
 * Simple in-memory rate limiter
 * For production, consider Redis-based rate limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

function getClientKey(req: Request): string {
  // Use X-Forwarded-For for proxied requests (Railway, Heroku, etc.)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress || 'unknown';
  return `${ip}:${req.path}`;
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getClientKey(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
      next();
      return;
    }

    store[key].count += 1;

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    if (store[key].count > maxRequests) {
      res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: `Quá nhiều requests. Vui lòng thử lại sau ${Math.ceil(windowMs / 60000)} phút.`,
        retryAfter: new Date(store[key].resetTime).toISOString(),
      });
      return;
    }

    next();
  };
}

// Pre-configured rate limiters
export const apiRateLimiter = createRateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes
export const aiRateLimiter = createRateLimiter(5, 60 * 1000); // 5 requests per minute for AI endpoints
