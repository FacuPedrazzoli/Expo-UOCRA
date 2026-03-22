import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger, { logHTTP } from './logger';

// ── Rate limiting para inscripciones (usa express-rate-limit) ────────────
// NOTA: En Vercel serverless, el almacenamiento en memoria no persiste entre invocaciones.
// El rate limit protección básico se mantiene pero puede ser menos efectivo en ese entorno.
// Para producción serverless, considerar usar una_store externo (Redis, etc.).
export const inscripcionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 10,                    // Máximo 10 intentos por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos',
    mensaje: 'Has superado el límite de intentos. Espera 15 minutos e intenta nuevamente.',
  },
  skip: (req) => req.method !== 'POST',
});

// ── Headers de seguridad (equivalente a helmet, sin dependencia externa) ──
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};

// ── Timeout de requests ─────────────────────────────────────────────────
export const requestTimeout = (ms: number = 30_000) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`Timeout (${ms}ms): ${req.method} ${req.originalUrl}`);
        res.status(408).json({
          error: 'Tiempo de espera agotado',
          mensaje: 'La solicitud tardó demasiado. Intenta nuevamente.',
        });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    next();
  };

// ── Logging de requests HTTP ────────────────────────────────────────────
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;

    if (res.statusCode >= 500)      logger.error(msg);
    else if (res.statusCode >= 400) logger.warn(msg);
    else                            logHTTP(msg);
  });

  next();
};

// ── Manejo de errores no capturados ─────────────────────────────────────
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`Error no manejado: ${err.message || err}`);
  if (err.stack) logger.debug(err.stack);

  if (res.headersSent) return;

  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'production'
      ? 'Ocurrió un error. Por favor intenta nuevamente.'
      : err.message,
  });
};

// ── 404 handler ─────────────────────────────────────────────────────────
export const unknownEndpoint = (req: Request, res: Response): void => {
  // Solo logguear rutas de API desconocidas, no assets estáticos
  if (req.originalUrl.startsWith('/api')) {
    logger.warn(`404: ${req.method} ${req.originalUrl}`);
  }
  res.status(404).json({ error: 'Ruta no encontrada' });
};

export default {
  requestLogger,
  errorHandler,
  unknownEndpoint,
  inscripcionRateLimit,
  securityHeaders,
  requestTimeout
};