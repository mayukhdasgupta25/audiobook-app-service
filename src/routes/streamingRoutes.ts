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
         const authHeader = req.headers.authorization;
         const userId = req.query['user'] as string;
         if (!authHeader && !userId) {
            ResponseHandler.unauthorized(res, MessageHandler.getErrorMessage('unauthorized.not_authenticated'));
            return;
         }

         const externalUrl = `${config.STREAMING_SERVICE_URL}${req.path}`;
         const isBinaryResponse = req.path.includes('/segments/');
         const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : { user_id: userId }),
         };

         const axiosConfig = {
            headers,
            responseType: (isBinaryResponse ? 'arraybuffer' : 'text') as 'arraybuffer' | 'text',
            timeout: 30000,
         };

         const response: AxiosResponse = req.method === 'POST'
            ? await axios.post(externalUrl, req.body, axiosConfig)
            : await axios.get(externalUrl, axiosConfig);

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
    *     description: |
    *       Proxied to streaming-service. Retrieve the master HLS playlist for a specific chapter.
    *       Authentication: provide **either** Bearer token **or** `user` query param (one is required).
    *     tags: [Streaming]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "cchapter1234567890abcdef"
    *       - $ref: '#/components/parameters/StreamingUserQueryParam'
    *       - name: bandwidth
    *         in: query
    *         required: false
    *         description: Optional client bandwidth in bps for bitrate selection
    *         schema: { type: integer, example: 500000 }
    *       - name: bitrate
    *         in: query
    *         required: false
    *         description: Optional preferred bitrate in kbps
    *         schema: { type: integer, example: 128 }
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
    *     description: |
    *       Retrieve the HLS playlist for a specific chapter and bitrate.
    *       Authentication: provide **either** Bearer token **or** `user` query param (one is required).
    *     tags: [Streaming]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "cchapter1234567890abcdef"
    *       - name: bitrate
    *         in: path
    *         required: true
    *         description: Audio bitrate in kbps
    *         schema:
    *           type: string
    *           example: "128"
    *       - $ref: '#/components/parameters/StreamingUserQueryParam'
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
    *     description: |
    *       Retrieve a specific audio segment for streaming.
    *       Authentication: provide **either** Bearer token **or** `user` query param (one is required).
    *     tags: [Streaming]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "cchapter1234567890abcdef"
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
    *         description: Segment filename (e.g. segment_001.m4s)
    *         schema:
    *           type: string
    *           example: "segment_001.m4s"
    *       - $ref: '#/components/parameters/StreamingUserQueryParam'
    *     responses:
    *       200:
    *         description: Audio segment retrieved successfully
    *         content:
    *           video/mp4:
    *             schema:
    *               type: string
    *               format: binary
    *           video/mp2t:
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
    *     description: |
    *       Check the transcoding/processing status of a chapter.
    *       Authentication: provide **either** Bearer token **or** `user` query param (one is required).
    *     tags: [Streaming]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "cchapter1234567890abcdef"
    *       - $ref: '#/components/parameters/StreamingUserQueryParam'
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
    *   post:
    *     summary: Preload chapter for streaming
    *     description: |
    *       Proxied to streaming-service. Triggers cache warming for chapter segments.
    *       Authentication: provide **either** Bearer token **or** `user` query param (one is required).
    *     tags: [Streaming]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: chapterId
    *         in: path
    *         required: true
    *         description: Chapter ID
    *         schema:
    *           type: string
    *           example: "cchapter1234567890abcdef"
    *       - $ref: '#/components/parameters/StreamingUserQueryParam'
    *     requestBody:
    *       required: false
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               bitrate: { type: integer, example: 128, description: "Optional bitrate in kbps (defaults to highest available)" }
    *           examples:
    *             defaultBitrate:
    *               summary: Preload with default (highest) bitrate
    *               value: {}
    *             specificBitrate:
    *               summary: Preload specific bitrate
    *               value:
    *                 bitrate: 128
    *     responses:
    *       200:
    *         description: Preload initiated successfully
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
    *                         chapterId: { type: string }
    *                         bitrate: { type: integer }
    *                         status: { type: string, example: "preloaded" }
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.post(
      '/chapters/:chapterId/preload',
      validateStreamingParams,
      proxyToStreamingService
   );

   return router;
}
