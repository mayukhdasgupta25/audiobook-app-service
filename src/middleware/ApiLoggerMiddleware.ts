/**
 * API Logger Middleware
 * Handles API access logging with custom format: host:api:statusCode:date_time_IST
 */
import { Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { apiAccessLogger } from '../config/logger';
import { formatIST } from '../utils/DateFormatter';

/**
 * Create pino-http middleware for API access logging
 * This middleware ONLY logs API access requests in the format: host:api:statusCode:date_time_IST
 */
export const apiLoggerMiddleware = pinoHttp({
   logger: apiAccessLogger,
   customSuccessMessage: (req: Request, res: Response) => {
      // Extract host from request
      const host = req.headers.host || req.ip || 'unknown';

      // Extract API endpoint
      const api = req.originalUrl || req.url || 'unknown';

      // Get status code from response
      const statusCode = res.statusCode || 200;

      // Format date/time in IST
      const dateTimeIST = formatIST();

      // Format: host:api:statusCode:date_time_IST
      return `${host}:${api}:${statusCode}:${dateTimeIST}`;
   },
   customErrorMessage: (req: Request, res: Response, _error: Error) => {
      // Extract host from request
      const host = req.headers.host || req.ip || 'unknown';

      // Extract API endpoint
      const api = req.originalUrl || req.url || 'unknown';

      // Get status code from response (or default to 500 for errors)
      const statusCode = res.statusCode || 500;

      // Format date/time in IST
      const dateTimeIST = formatIST();

      // Format: host:api:statusCode:date_time_IST
      return `${host}:${api}:${statusCode}:${dateTimeIST}`;
   },
   customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'responseTime',
   },
});

