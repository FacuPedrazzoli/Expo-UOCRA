import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/env';
import { RateLimitError } from '../errors';
import logger from '../../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export const rateLimit = (options?: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
}) => {
  const windowMs = options?.windowMs || config.rateLimit.windowMs;
  const maxRequests = options?.maxRequests || config.rateLimit.maxRequests;
  const keyGenerator = options?.keyGenerator || ((req: Request) => req.ip || 'unknown');

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = store[key];

    if (!record || now > record.resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      logger.warn(`[RATE LIMIT] Exceeded limit for IP: ${key}`);
      
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', record.resetTime.toString());
      
      return next(new RateLimitError('Too many requests. Please try again later.'));
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

    next();
  };
};

export const strictRateLimit = (maxRequests: number = 10, windowMs: number = 60000) => {
  return rateLimit({ maxRequests, windowMs });
};
