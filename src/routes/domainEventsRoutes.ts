import { Router } from 'express';
import { domainEventsController } from '../controllers/DomainEventsController';
import { authenticateJWTOrQuery } from '../middleware/AuthMiddleware';

export function createDomainEventsRoutes(): Router {
   const router = Router();

   router.get('/stream', authenticateJWTOrQuery, domainEventsController.streamCacheEvents);

   return router;
}
