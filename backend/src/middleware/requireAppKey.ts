import type { Request, Response, NextFunction } from 'express';

import { env } from '../config/env';

export function requireAppKey(req: Request, res: Response, next: NextFunction): void {
  const appKey = req.header('X-App-Key');

  if (!appKey || appKey !== env.APP_SECRET_KEY) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Thiếu hoặc sai X-App-Key',
    });
    return;
  }

  next();
}
