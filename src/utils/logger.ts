import winston from 'winston';
import path from 'path';
import fs from 'fs';

const isProd = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [];

transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
      ),
    ),
    level: isProd ? 'info' : 'debug',
  })
);

if (!isProd) {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'errores.log'),
        level: 'error',
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, stack }) =>
            stack
              ? `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`
              : `${timestamp} [${level.toUpperCase()}]: ${message}`
          ),
        ),
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'historiales.log'),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, stack }) =>
            stack
              ? `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`
              : `${timestamp} [${level.toUpperCase()}]: ${message}`
          ),
        ),
      })
    );
  } catch (e) {
    console.warn('[Logger] No se pudieron crear archivos de log:', e);
  }
}

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'blue' };

winston.addColors(colors);

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  levels,
  transports,
  ...(isProd ? {} : {
    exceptionHandlers: [
      new winston.transports.Console({ format: winston.format.simple() }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({ format: winston.format.simple() }),
    ],
  }),
});

export default logger;

export const logError = (message: string, error: any): void => {
  logger.error(`${message}: ${error?.message || error}`);
  if (error?.stack && !isProd) logger.debug(error.stack);
};

export const logHTTP = (message: string): void => {
  logger.log('http', message);
};

export const logDB = (message: string): void => {
  logger.debug(`[DB] ${message}`);
};