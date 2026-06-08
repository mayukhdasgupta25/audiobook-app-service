/**
 * Health Routes
 * Handles health check and system status endpoints
 */
import { Router, Request, Response } from 'express';
import { requireHealthSupportAuth } from '../middleware/HealthSupportAuth';
import { getAppHealthStatus } from '../services/HealthService';

export function createHealthRoutes(): Router {
   const router = Router();

   /**
    * @swagger
    * /api/app/health:
    *   get:
    *     summary: Health check endpoint
    *     description: Check the health status of the API server (requires @srota-support.com credentials)
    *     tags: [Health]
    *     security:
    *       - basicAuth: []
    *     responses:
    *       200:
    *         description: Server is healthy
    *       401:
    *         description: Authentication required
    *       503:
    *         description: One or more dependencies are unhealthy
    */
   router.get('/health', requireHealthSupportAuth, healthCheck);

   return router;
}

/**
 * Health check handler
 */
async function healthCheck(_req: Request, res: Response): Promise<void> {
   const healthData = await getAppHealthStatus();
   const statusCode = healthData.status === 'healthy' ? 200 : 503;

   res.status(statusCode).json({
      success: healthData.status === 'healthy',
      message: healthData.status === 'healthy' ? 'Service is healthy' : 'Service is unhealthy',
      data: healthData,
      timestamp: healthData.timestamp,
   });
}
