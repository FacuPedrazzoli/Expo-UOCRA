import winston from 'winston';
import path from 'path';
import fs from 'fs';

const isProd = process.env.NODE_ENV === 'production';

// Asegurar que existe el directorio para logs (solo en desarrollo)
let logDir: string;
try {
  logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch {
  logDir = '/tmp/logs';
  try { fs.mkdirSync(logDir, { recursive: true }); } catch { logDir = ''; }
}

// Definir niveles de log personalizados y colores
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Definir colores para cada nivel
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Añadir colores a winston
winston.addColors(colors);

// Definir formato de logs para archivos
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) =>
    stack
      ? `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`
      : `${timestamp} [${level.toUpperCase()}]: ${message}`
  ),
);

// Definir formato para consola con colores
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Crear transports (destinos de los logs) con rotación por tamaño
const transports: winston.transport[] = [
  // Log de errores en archivo separado (max 5MB, 3 archivos)
  new winston.transports.File({
    filename: path.join(logDir, 'errores.log'),
    level: 'error',
    maxsize: 5 * 1024 * 1024,
    maxFiles: 3,
  }),
  // Log de todo en archivo general (max 10MB, 5 archivos)
  new winston.transports.File({
    filename: path.join(logDir, 'historiales.log'),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
  }),
  // Log en consola (en producción solo info+, en dev todo)
  new winston.transports.Console({
    format: consoleFormat,
    level: isProd ? 'info' : 'debug',
  }),
];

// Exportar el logger configurado
const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  levels,
  format: fileFormat,
  transports,
  // Captura de excepciones y promesas rechazadas no manejadas
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

export default logger;

// Helper function para manejar errores
export const logError = (message: string, error: any): void => {
  logger.error(`${message}: ${error?.message || error}`);
  if (error?.stack && !isProd) {
    logger.debug(error.stack);
  }
};

// Helper function para peticiones HTTP
export const logHTTP = (message: string): void => {
  logger.log('http', message);
};

// Helper function para información de transacciones en BD
export const logDB = (message: string): void => {
  logger.debug(`[DB] ${message}`);
};