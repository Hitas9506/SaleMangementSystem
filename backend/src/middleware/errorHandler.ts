import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { ApiError } from '../lib/apiError';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      error: 'INVALID_INPUT',
      message: 'Dữ liệu đầu vào không hợp lệ',
      details: error.flatten().fieldErrors,
    });
    return;
  }

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Origin không được phép truy cập API này',
    });
    return;
  }

  // Log detailed error for debugging
  console.error('[ERROR]', {
    requestId: (req as any).requestId,
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  });

  // Categorize common database errors
  if (error?.code === 'P2002') {
    res.status(409).json({
      error: 'DUPLICATE_ENTRY',
      message: 'Dữ liệu đã tồn tại trong hệ thống',
    });
    return;
  }

  if (error?.code === 'P2025') {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Không tìm thấy dữ liệu',
    });
    return;
  }

  // Generic database error
  if (error?.code?.startsWith('P')) {
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.',
    });
    return;
  }

  // Generic server error
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
  });
};
