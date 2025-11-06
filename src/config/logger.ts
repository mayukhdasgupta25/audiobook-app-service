/**
 * Pino Logger Configuration
 * Provides structured logging with file destinations for different components
 */
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { config } from './env';

// Ensure logs directory exists
const logDir = path.resolve(process.cwd(), config.LOG_DIR);
if (!fs.existsSync(logDir)) {
   fs.mkdirSync(logDir, { recursive: true });
}

// Base logger configuration
const baseLoggerConfig: pino.LoggerOptions = {
   level: config.LOG_LEVEL,
   formatters: {
      level: (label) => {
         return { level: label };
      },
   },
   timestamp: pino.stdTimeFunctions.isoTime,
};

// Create file destinations for different log files
const appLogFile = pino.destination(path.join(logDir, 'app.log'));
const errorLogFile = pino.destination(path.join(logDir, 'error.log'));
const apiAccessLogFile = pino.destination(path.join(logDir, 'api-access.log'));
const rabbitmqLogFile = pino.destination(path.join(logDir, 'rabbitmq.log'));
const redisLogFile = pino.destination(path.join(logDir, 'redis.log'));
const bullLogFile = pino.destination(path.join(logDir, 'bull.log'));

// Error-only logger configuration
const errorLoggerConfig: pino.LoggerOptions = {
   ...baseLoggerConfig,
   level: 'error',
};

// Create main application logger
// Writes to app.log file
// In development, logs can be viewed by tailing the file or using pino-pretty
export const logger = pino(baseLoggerConfig, appLogFile);

// Error-only logger (writes to error.log)
export const errorLogger = pino(errorLoggerConfig, errorLogFile);

// API access logger (writes to api-access.log)
// This logger is specifically for API access logging with custom format
export const apiAccessLogger = pino(
   {
      ...baseLoggerConfig,
      base: { component: 'api-access' },
   },
   apiAccessLogFile
);

// RabbitMQ logger (writes to rabbitmq.log)
export const rabbitmqLogger = pino(
   {
      ...baseLoggerConfig,
      base: { component: 'rabbitmq' },
   },
   rabbitmqLogFile
);

// Redis logger (writes to redis.log)
export const redisLogger = pino(
   {
      ...baseLoggerConfig,
      base: { component: 'redis' },
   },
   redisLogFile
);

// Bull logger (writes to bull.log)
export const bullLogger = pino(
   {
      ...baseLoggerConfig,
      base: { component: 'bull' },
   },
   bullLogFile
);

// Export default logger for convenience
export default logger;

