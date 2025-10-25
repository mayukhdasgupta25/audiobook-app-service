/**
 * Offline Download Controller
 * Handles HTTP requests and responses for offline download functionality
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OfflineDownloadService } from '../services/OfflineDownloadService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { DownloadRequest } from '../models/OfflineDownloadDto';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';

export class OfflineDownloadController {
   private offlineDownloadService: OfflineDownloadService;

   constructor(prisma: PrismaClient) {
      this.offlineDownloadService = new OfflineDownloadService(prisma);
   }

   /**
    * @swagger
    * /api/v1/downloads:
    *   post:
    *     summary: Request offline download
    *     description: Request an offline download for an audiobook
    *     tags: [Offline Downloads]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/DownloadRequest'
    *           examples:
    *             example1:
    *               summary: Request download
    *               value:
    *                 audiobookId: "123e4567-e89b-12d3-a456-426614174000"
    *                 quality: "high"
    *     responses:
    *       201:
    *         description: Download requested successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/OfflineDownload'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   requestDownload = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const downloadRequest: DownloadRequest = req.body;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const download = await this.offlineDownloadService.requestDownload(userId, downloadRequest);

      ResponseHandler.success(res, download, MessageHandler.getSuccessMessage('downloads.requested'), 201);
   });

   /**
    * @swagger
    * /api/v1/downloads:
    *   get:
    *     summary: Get user downloads
    *     description: Retrieve all downloads for the authenticated user
    *     tags: [Offline Downloads]
    *     parameters:
    *       - name: status
    *         in: query
    *         schema:
    *           type: string
    *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED]
    *         description: Filter by download status
    *     responses:
    *       200:
    *         description: Downloads retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       type: array
    *                       items:
    *                         $ref: '#/components/schemas/OfflineDownload'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getUserDownloads = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { status } = req.query;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const downloads = await this.offlineDownloadService.getUserDownloads(userId, status as any);

      ResponseHandler.success(res, downloads, MessageHandler.getSuccessMessage('downloads.retrieved'));
   });

   /**
    * @swagger
    * /api/v1/downloads/{id}/progress:
    *   get:
    *     summary: Get download progress
    *     description: Retrieve the current progress of a specific download
    *     tags: [Offline Downloads]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Download ID
    *     responses:
    *       200:
    *         description: Download progress retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/DownloadProgress'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getDownloadProgress = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const progress = await this.offlineDownloadService.getDownloadProgress(userId, id as string);

      ResponseHandler.success(res, progress, MessageHandler.getSuccessMessage('downloads.progress_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/downloads/{id}/cancel:
    *   post:
    *     summary: Cancel download
    *     description: Cancel an ongoing or pending download
    *     tags: [Offline Downloads]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Download ID
    *     responses:
    *       200:
    *         description: Download cancelled successfully
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
    *                         message:
    *                           type: string
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   cancelDownload = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      await this.offlineDownloadService.cancelDownload(userId, id as string);

      ResponseHandler.success(res, { message: 'Download cancelled successfully' }, MessageHandler.getSuccessMessage('downloads.cancelled'));
   });

   /**
    * @swagger
    * /api/v1/downloads/{id}/retry:
    *   post:
    *     summary: Retry failed download
    *     description: Retry a failed download
    *     tags: [Offline Downloads]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Download ID
    *     responses:
    *       200:
    *         description: Download retry initiated successfully
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
    *                         message:
    *                           type: string
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   retryDownload = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      await this.offlineDownloadService.retryDownload(userId, id as string);

      ResponseHandler.success(res, { message: 'Download retry initiated successfully' }, MessageHandler.getSuccessMessage('downloads.retry_initiated'));
   });

   /**
    * @swagger
    * /api/v1/downloads/{id}:
    *   delete:
    *     summary: Delete completed download
    *     description: Delete a completed download and its associated file
    *     tags: [Offline Downloads]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Download ID
    *     responses:
    *       204:
    *         $ref: '#/components/responses/NoContent'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   deleteDownload = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      await this.offlineDownloadService.deleteDownload(userId, id as string);

      ResponseHandler.noContent(res);
   });

   /**
    * @swagger
    * /api/v1/downloads/queue/status:
    *   get:
    *     summary: Get download queue status
    *     description: Retrieve the current status of the download queue (admin endpoint)
    *     tags: [Offline Downloads]
    *     responses:
    *       200:
    *         description: Queue status retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/DownloadQueueStatus'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getQueueStatus = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const queueStatus = await this.offlineDownloadService.getDownloadQueueStatus();

      ResponseHandler.success(res, queueStatus, MessageHandler.getSuccessMessage('downloads.queue_status_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/downloads/stats:
    *   get:
    *     summary: Get download statistics
    *     description: Retrieve comprehensive download statistics (admin endpoint)
    *     tags: [Offline Downloads]
    *     responses:
    *       200:
    *         description: Statistics retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/DownloadStats'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getDownloadStats = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const stats = await this.offlineDownloadService.getDownloadStats();

      ResponseHandler.success(res, stats, MessageHandler.getSuccessMessage('downloads.stats_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/audiobooks/{audiobookId}/offline-availability:
    *   put:
    *     summary: Update offline availability
    *     description: Update the offline availability status of an audiobook (admin endpoint)
    *     tags: [Offline Downloads]
    *     parameters:
    *       - name: audiobookId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Audiobook ID
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - isAvailable
    *             properties:
    *               isAvailable:
    *                 type: boolean
    *                 description: Whether the audiobook is available for offline download
    *           examples:
    *             example1:
    *               summary: Enable offline availability
    *               value:
    *                 isAvailable: true
    *             example2:
    *               summary: Disable offline availability
    *               value:
    *                 isAvailable: false
    *     responses:
    *       200:
    *         description: Offline availability updated successfully
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
    *                         audiobookId:
    *                           type: string
    *                         isOfflineAvailable:
    *                           type: boolean
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateOfflineAvailability = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { audiobookId } = req.params;
      const { isAvailable } = req.body;

      await this.offlineDownloadService.updateOfflineAvailability(audiobookId!, isAvailable);

      ResponseHandler.success(res, {
         audiobookId,
         isOfflineAvailable: isAvailable
      }, MessageHandler.getSuccessMessage('downloads.availability_updated'));
   });
}
