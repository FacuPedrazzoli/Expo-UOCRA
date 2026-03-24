import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) {
    this.defaultTTL = defaultTTL;
    setInterval(() => this.cleanup(), 60000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.store.set(key, { value, expiresAt });
    logger.debug(`[CACHE] Set key: ${key}`);
  }

  delete(key: string): void {
    this.store.delete(key);
    logger.debug(`[CACHE] Deleted key: ${key}`);
  }

  clear(): void {
    this.store.clear();
    logger.info('[CACHE] Cleared all entries');
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug(`[CACHE] Cleaned ${cleaned} expired entries`);
    }
  }

  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

const cache = new MemoryCache();

export const getCache = (): MemoryCache => cache;

export const cacheMiddleware = (key: string, ttl?: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cached = cache.get(key);
    if (cached) {
      logger.debug(`[CACHE] Cache hit for key: ${key}`);
      res.json(cached);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
        logger.debug(`[CACHE] Cached response for key: ${key}`);
      }
      return originalJson(body);
    };

    next();
  };
};
