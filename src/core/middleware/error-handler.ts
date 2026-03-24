import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import logger from '../../utils/logger';

interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const message = err instanceof AppError ? err.message : 'Internal server error';

  const errorResponse: ErrorResponse = {
    error: code || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  if (process.env.NODE_ENV === 'development') {
    (errorResponse as any).stack = err.stack;
  }

  if (statusCode >= 500) {
    logger.error(`[SERVER ERROR] ${req.method} ${req.path}`, {
      error: err.message,
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query,
    });
  } else {
    logger.warn(`[CLIENT ERROR] ${req.method} ${req.path}`, {
      statusCode,
      error: err.message,
    });
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  globalErrorHandler(error, req, res, () => {});
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
