/**
 * Listening history controller
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ListeningHistoryService } from '../services/ListeningHistoryService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { ListeningHistoryQueryParams } from '../models/ListeningHistoryDto';

export class ListeningHistoryController {
   private listeningHistoryService: ListeningHistoryService;

   constructor(prisma: PrismaClient) {
      this.listeningHistoryService = new ListeningHistoryService(prisma);
   }

   /**
    * @swagger
    * /api/v1/listening-history/user/{userProfileId}:
    *   get:
    *     summary: Get listening history for a user
    *     tags: [ListeningHistory]
    *     parameters:
    *       - name: userProfileId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - name: audiobookId
    *         in: query
    *         schema:
    *           type: string
    *       - name: completed
    *         in: query
    *         schema:
    *           type: boolean
    *       - name: sortBy
    *         in: query
    *         schema:
    *           type: string
    *           enum: [lastListenedAt, createdAt, updatedAt, currentPosition]
    *       - name: sortOrder
    *         in: query
    *         schema:
    *           type: string
    *           enum: [asc, desc]
    *     responses:
    *       200:
    *         description: Listening history retrieved successfully
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   getListeningHistoryByUserProfileId = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { userProfileId } = req.params as { userProfileId: string };
         const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
         const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;

         let completed: boolean | undefined;
         if (req.query['completed'] !== undefined) {
            const raw = req.query['completed'] as string;
            if (raw === 'true') {
               completed = true;
            } else if (raw === 'false') {
               completed = false;
            }
         }

         const query: ListeningHistoryQueryParams = {
            page,
            limit,
            sortBy: (req.query['sortBy'] as ListeningHistoryQueryParams['sortBy']) || 'lastListenedAt',
            sortOrder: (req.query['sortOrder'] as ListeningHistoryQueryParams['sortOrder']) || 'desc',
         };
         const audiobookId = req.query['audiobookId'] as string | undefined;
         if (audiobookId) {
            query.audiobookId = audiobookId;
         }
         if (completed !== undefined) {
            query.completed = completed;
         }

         const result = await this.listeningHistoryService.getListeningHistoryByUserProfileId(
            userProfileId,
            query
         );

         const pagination = ResponseHandler.calculatePagination(page, limit, result.totalCount);
         ResponseHandler.paginated(
            res,
            result.listeningHistory,
            pagination,
            MessageHandler.getSuccessMessage('listening_history.retrieved')
         );
      }
   );
}
