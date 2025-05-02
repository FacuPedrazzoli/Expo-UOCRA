import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Asegurar que existe el directorio para logs
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
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

// Definir formato de logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
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

// Crear transports (destinos de los logs)
const transports = [
  // Log de errores en archivo separado
  new winston.transports.File({
    filename: path.join(logDir, 'errores.log'),
    level: 'error',
  }),
  // Log de todo en archivo general
  new winston.transports.File({
    filename: path.join(logDir, 'historiales.log'),
  }),
  // Log en consola para desarrollo
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Exportar el logger configurado
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
});

export default logger;

// Helper function para manejar errores
export const logError = (message: string, error: any): void => {
  logger.error(`${message}: ${error.message || error}`);
  if (error.stack) {
    logger.debug(error.stack);
  }
};

// Helper function para peticiones HTTP
export const logHTTP = (message: string): void => {
  logger.http(message);
};

// Helper function para información de transacciones en BD
export const logDB = (message: string): void => {
  logger.debug(`[DB] ${message}`);
};