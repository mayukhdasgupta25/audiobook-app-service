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

// Open file descriptors for log files
// Using file descriptors ensures files are available before writing
const appLogFd = fs.openSync(path.join(logDir, 'app.log'), 'a');
const errorLogFd = fs.openSync(path.join(logDir, 'error.log'), 'a');
const apiAccessLogFd = fs.openSync(path.join(logDir, 'api-access.log'), 'a');
const rabbitmqLogFd = fs.openSync(path.join(logDir, 'rabbitmq.log'), 'a');
const redisLogFd = fs.openSync(path.join(logDir, 'redis.log'), 'a');
const bullLogFd = fs.openSync(path.join(logDir, 'bull.log'), 'a');

// Create file destinations using file descriptors
// Using fd option ensures the file descriptor is available before writing
// minLength: 0 ensures immediate writes, sync: false prevents blocking
const appLogFile = pino.destination({
   fd: appLogFd,
   minLength: 0,
   sync: false,
});
const errorLogFile = pino.destination({
   fd: errorLogFd,
   minLength: 0,
   sync: false,
});
const apiAccessLogFile = pino.destination({
   fd: apiAccessLogFd,
   minLength: 0,
   sync: false,
});
const rabbitmqLogFile = pino.destination({
   fd: rabbitmqLogFd,
   minLength: 0,
   sync: false,
});
const redisLogFile = pino.destination({
   fd: redisLogFd,
   minLength: 0,
   sync: false,
});
const bullLogFile = pino.destination({
   fd: bullLogFd,
   minLength: 0,
   sync: false,
});

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

