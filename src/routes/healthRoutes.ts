/**
 * Health Routes
 * Handles health check and system status endpoints
 */
import { Router, Request, Response } from 'express';
import { ResponseHandler } from '../utils/ResponseHandler';
import { MessageHandler } from '../utils/MessageHandler';

export function createHealthRoutes(): Router {
   const router = Router();

   /**
    * @swagger
    * /api/health:
    *   get:
    *     summary: Health check endpoint
    *     description: Check the health status of the API server
    *     tags: [Health]
    *     responses:
    *       200:
    *         description: Server is healthy
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       type: object
    *                       properties:
    *                         status:
    *                           type: string
    *                           example: "OK"
    *                         timestamp:
    *                           type: string
    *                           format: date-time
    *                           example: "2024-01-15T10:30:00Z"
    *                         uptime:
    *                           type: number
    *                           example: 3600
    *                         environment:
    *                           type: string
    *                           example: "development"
    *                         version:
    *                           type: string
    *                           example: "1.0.0"
    *             examples:
    *               success:
    *                 summary: Health check response
    *                 value:
    *                   success: true
    *                   message: "Service is healthy"
    *                   data:
    *                     status: "OK"
    *                     timestamp: "2024-01-15T10:30:00Z"
    *                     uptime: 3600
    *                     environment: "development"
    *                     version: "1.0.0"
    *                   timestamp: "2024-01-15T10:30:00Z"
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get('/health', healthCheck);

   return router;
}

/**
 * Health check handler
 */
function healthCheck(_req: Request, res: Response): void {
   const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['npm_package_version'] || '1.0.0'
   };

   ResponseHandler.success(res, healthData, MessageHandler.getSuccessMessage('general.health_check'));
}
