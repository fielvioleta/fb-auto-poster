import path from 'path';
import fs from 'fs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { loadConfig } from '../config/env';

const LOG_DIR = path.resolve(process.cwd(), 'logs');

// Ensure the logs directory exists before any transport tries to write.
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const config = loadConfig();

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${String(timestamp)} [${level}] ${String(message)}${metaString}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/** Application-wide Winston logger with daily-rotated files. */
export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'restaurant-fb-autopost' },
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      format: fileFormat,
    }),
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '60d',
      format: fileFormat,
    }),
  ],
});

/** Returns a child logger tagged with a module name for easier tracing. */
export function createLogger(module: string): winston.Logger {
  return logger.child({ module });
}
