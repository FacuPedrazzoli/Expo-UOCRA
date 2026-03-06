import { Request, Response, NextFunction } from 'express';
import logger, { logHTTP } from './logger';

// --- Rate Limiter en memoria (sin dependencias externas) ---
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Solo limitar POST (escritura)
  if (req.method !== 'POST') return next();

  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const entry = rateLimitStore.get(clientIp);
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  entry.count++;
  if (entry.count > maxRequests) {
    logger.warn(`Rate limit excedido para IP: ${clientIp}`);
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde.' });
  }

  return next();
};

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetTime) rateLimitStore.delete(ip);
  }
}, 300000);

// --- Headers de seguridad (equivalente a helmet, sin dependencia externa) ---
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

// --- Sanitización básica de inputs ---
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) return value.map(sanitizeValue);
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};

// Middleware para registrar todas las peticiones HTTP
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Prepara la respuesta para loggear cuando finalice
  const start = Date.now();
  
  // Cuando la respuesta termine, registra los detalles
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    // Si es un código de error, loggea como warning o error
    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logHTTP(message);
    }
  });
  
  next();
};

// Middleware para manejar errores no capturados
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error no manejado: ${err.message}`);
  logger.debug(err.stack || 'No stack trace disponible');
  
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'production' 
      ? 'Se produjo un error en el servidor' 
      : err.message
  });
};

// Middleware para rutas no encontradas
export const unknownEndpoint = (req: Request, res: Response) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    error: 'Ruta no encontrada'
  });
};

export default {
  requestLogger,
  errorHandler,
  unknownEndpoint,
  rateLimiter,
  securityHeaders,
  inputSanitizer
};