import { Request, Response, NextFunction } from 'express';
import logger, { logHTTP } from './logger';

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
  unknownEndpoint
};