/**
 * OfflineDownloadController Tests
 * Tests for download management operations
 */

import { PrismaClient } from '@prisma/client';
import { OfflineDownloadController } from '../../controllers/OfflineDownloadController';
import { OfflineDownloadService } from '../../services/OfflineDownloadService';
import { ResponseHandler } from '../../utils/ResponseHandler';
import { MessageHandler } from '../../utils/MessageHandler';
import { ApiError } from '../../types/ApiError';
import { HttpStatusCode } from '../../types/common';

// Mock dependencies
jest.mock('../../services/OfflineDownloadService');
jest.mock('../../utils/ResponseHandler');
jest.mock('../../utils/MessageHandler');

describe('OfflineDownloadController', () => {
   let offlineDownloadController: OfflineDownloadController;
   let mockPrisma: PrismaClient;
   let mockReq: any;
   let mockRes: any;
   let mockOfflineDownloadService: jest.Mocked<OfflineDownloadService>;

   beforeEach(() => {
      mockPrisma = {} as PrismaClient;
      mockReq = {
         params: {},
         query: {},
         body: {},
         user: { id: 'user-123' },
         originalUrl: '/api/v1/downloads',
      } as any;
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
         send: jest.fn().mockReturnThis(),
      } as any;

      mockReq.next = jest.fn();
      jest.clearAllMocks();

      offlineDownloadController = new OfflineDownloadController(mockPrisma);
      mockOfflineDownloadService = (offlineDownloadController as any).offlineDownloadService;
   });

   describe('requestDownload', () => {
      it('should request download for authenticated user', async () => {
         mockReq.body = {
            audiobookId: 'audiobook-123',
            quality: 'high'
         };

         const mockDownload = {
            id: 'download-1',
            userId: 'user-123',
            audiobookId: 'audiobook-123',
            status: 'PENDING'
         };

         mockOfflineDownloadService.requestDownload.mockResolvedValue(mockDownload as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Download requested');

         await offlineDownloadController.requestDownload(mockReq, mockRes, mockReq.next);

         expect(mockOfflineDownloadService.requestDownload).toHaveBeenCalledWith(
            'user-123',
            mockReq.body
         );
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockDownload,
            'Download requested',
            HttpStatusCode.CREATED
         );
      });
   });

   describe('getUserDownloads', () => {
      it('should retrieve user downloads without filter', async () => {
         const mockDownloads = [
            { id: 'download-1', status: 'PENDING' },
            { id: 'download-2', status: 'COMPLETED' },
         ];

         mockOfflineDownloadService.getUserDownloads.mockResolvedValue(mockDownloads as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Downloads retrieved');

         await offlineDownloadController.getUserDownloads(mockReq, mockRes, mockReq.next);

         expect(mockOfflineDownloadService.getUserDownloads).toHaveBeenCalledWith('user-123', undefined);
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockDownloads,
            'Downloads retrieved'
         );
      });

      it('should filter downloads by status', async () => {
         mockReq.query = { status: 'PENDING' };

         mockOfflineDownloadService.getUserDownloads.mockResolvedValue([] as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Downloads retrieved');

         await offlineDownloadController.getUserDownloads(mockReq, mockRes, mockReq.next);

         expect(mockOfflineDownloadService.getUserDownloads).toHaveBeenCalledWith('user-123', 'PENDING');
      });
   });

   describe('getDownloadProgress', () => {
      it('should retrieve download progress', async () => {
         mockReq.params.id = 'download-123';

         const mockProgress = {
            downloadId: 'download-123',
            status: 'IN_PROGRESS',
            progress: 50,
            estimatedTimeRemaining: 30
         };

         mockOfflineDownloadService.getDownloadProgress.mockResolvedValue(mockProgress as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Progress retrieved');

         await offlineDownloadController.getDownloadProgress(mockReq, mockRes, mockReq.next);

         expect(mockOfflineDownloadService.getDownloadProgress).toHaveBeenCalledWith(
            'user-123',
            'download-123'
         );
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockProgress,
            'Progress retrieved'
         );
      });
   });

   describe('cancelDownload', () => {
      it('should cancel download successfully', async () => {
         mockReq.params.id = 'download-123';
         mockOfflineDownloadService.cancelDownload.mockResolvedValue(undefined);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Download cancelled');

         await offlineDownloadController.cancelDownload(mockReq, mockRes, mockReq.next);

         expect(mockOfflineDownloadService.cancelDownload).toHaveBeenCalledWith(
            'user-123',
            'download-123'
         );
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            { message: 'Download cancelled successfully' },
            'Download cancelled'
         );
      });
   });

   describe('error handling', () => {
      it('should propagate service errors', async () => {
         mockReq.params.id = 'download-123';
         const error = new ApiError('Download not found', HttpStatusCode.NOT_FOUND);
         mockOfflineDownloadService.getDownloadProgress.mockRejectedValue(error);

         try {
            await offlineDownloadController.getDownloadProgress(mockReq, mockRes, mockReq.next);
         } catch (e) {
            expect(e).toEqual(error);
         }
      });
   });
});

