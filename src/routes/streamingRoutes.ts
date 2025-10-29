/**
 * Streaming Routes
 * Defines HTTP routes for audio streaming endpoints that proxy to external streaming service
 */
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosResponse } from 'axios';
import { config } from '../config/env';
import { ResponseHandler } from '../utils/ResponseHandler';
import { MessageHandler } from '../utils/MessageHandler';

export function createStreamingRoutes(_prisma: PrismaClient): Router {
   const router = Router();

   /**
    * Parameter validation middleware for streaming routes
    * Ensures parameters are not null, undefined, or empty strings
    */
   const validateStreamingParams = (req: Request, res: Response, next: NextFunction): void => {
      const { chapterId, bitrate, segmentId } = req.params;

      // Validate chapterId (required for all routes)
      if (!chapterId || chapterId.trim() === '') {
         ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.chapter_id_required'));
         return;
      }

      // Validate bitrate (required for playlist and segment routes)
      if (req.path.includes('/playlist.m3u8') || req.path.includes('/segments/')) {
         if (!bitrate || bitrate.trim() === '') {
            ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bitrate_required'));
            return;
         }
      }

      // Validate segmentId (required for segment routes)
      if (req.path.includes('/segments/')) {
         if (!segmentId || segmentId.trim() === '') {
            ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.segment_id_required'));
            return;
         }
      }

      next();
   };

   /**
    * Proxy handler for streaming requests
    * Forwards authenticated requests to external streaming service
    */
   const proxyToStreamingService = async (req: Request, res: Response): Promise<void> => {
      try {
         const userId = req.session.userId;
         if (!userId) {
            ResponseHandler.unauthorized(res, MessageHandler.getErrorMessage('unauthorized.not_authenticated'));
            return;
         }

         // Construct the external service URL
         const externalUrl = `${config.STREAMING_SERVICE_URL}${req.path}`;

         // Make request to external streaming service
         const response: AxiosResponse = await axios.get(externalUrl, {
            headers: {
               'user_id': userId,
               'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
         });

         // Forward response headers
         Object.keys(response.headers).forEach(key => {
            res.setHeader(key, response.headers[key] as string);
         });

         // Set response status and data
         res.status(response.status).send(response.data);

      } catch (error) {
         // console.error('Streaming service proxy error:', error);

         if (axios.isAxiosError(error)) {
            if (error.response) {
               // Forward error response from external service
               res.status(error.response.status).send(error.response.data);
            } else if (error.request) {
               // Network error
               ResponseHandler.internalError(res, MessageHandler.getErrorMessage('error.internal.streaming_service_unavailable'));
            } else {
               // Other error
               ResponseHandler.internalError(res, MessageHandler.getErrorMessage('error.internal.default'));
            }
         } else {
            ResponseHandler.internalError(res, MessageHandler.getErrorMessage('error.internal_server_error'));
         }
      }
   };

   /**
    * @swagger
    * /api/v1/stream/chapters/{chapterId}/master.m3u8:
    *   get:
    *     summary: Get master playlist for chapter
    *     description: Retrieve the master HLS playlist for a specific chapter
    *     tags: [Streaming]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "chapter_123"
    *     responses:
    *       200:
    *         description: Master playlist retrieved successfully
    *         content:
    *           application/vnd.apple.mpegurl:
    *             schema:
    *               type: string
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/chapters/:chapterId/master.m3u8',
      validateStreamingParams,
      proxyToStreamingService
   );

   /**
    * @swagger
    * /api/v1/stream/chapters/{chapterId}/{bitrate}/playlist.m3u8:
    *   get:
    *     summary: Get bitrate-specific playlist for chapter
    *     description: Retrieve the HLS playlist for a specific chapter and bitrate
    *     tags: [Streaming]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "chapter_123"
    *       - name: bitrate
    *         in: path
    *         required: true
    *         description: Audio bitrate in kbps
    *         schema:
    *           type: string
    *           example: "128"
    *     responses:
    *       200:
    *         description: Playlist retrieved successfully
    *         content:
    *           application/vnd.apple.mpegurl:
    *             schema:
    *               type: string
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/chapters/:chapterId/:bitrate/playlist.m3u8',
      validateStreamingParams,
      proxyToStreamingService
   );

   /**
    * @swagger
    * /api/v1/stream/chapters/{chapterId}/{bitrate}/segments/{segmentId}:
    *   get:
    *     summary: Get audio segment
    *     description: Retrieve a specific audio segment for streaming
    *     tags: [Streaming]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "chapter_123"
    *       - name: bitrate
    *         in: path
    *         required: true
    *         description: Audio bitrate in kbps
    *         schema:
    *           type: string
    *           example: "128"
    *       - name: segmentId
    *         in: path
    *         required: true
    *         description: Segment ID
    *         schema:
    *           type: string
    *           example: "segment_001"
    *     responses:
    *       200:
    *         description: Audio segment retrieved successfully
    *         content:
    *           audio/mpeg:
    *             schema:
    *               type: string
    *               format: binary
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/chapters/:chapterId/:bitrate/segments/:segmentId',
      validateStreamingParams,
      proxyToStreamingService
   );

   /**
    * @swagger
    * /api/v1/stream/chapters/{chapterId}/status:
    *   get:
    *     summary: Get chapter processing status
    *     description: Check the transcoding/processing status of a chapter
    *     tags: [Streaming]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "chapter_123"
    *     responses:
    *       200:
    *         description: Status retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 status:
    *                   type: string
    *                   example: "completed"
    *                 progress:
    *                   type: number
    *                   example: 100
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/chapters/:chapterId/status',
      validateStreamingParams,
      proxyToStreamingService
   );

   /**
    * @swagger
    * /api/v1/stream/chapters/{chapterId}/preload:
    *   get:
    *     summary: Preload chapter for streaming
    *     description: Trigger preloading/warming cache for a chapter
    *     tags: [Streaming]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "chapter_123"
    *     responses:
    *       200:
    *         description: Preload initiated successfully
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 message:
    *                   type: string
    *                   example: "Preload initiated"
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/chapters/:chapterId/preload',
      validateStreamingParams,
      proxyToStreamingService
   );

   return router;
}
