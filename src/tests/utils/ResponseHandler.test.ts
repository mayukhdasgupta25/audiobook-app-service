/**
 * ResponseHandler Tests
 * Tests for response formatting, status codes, and pagination
 */

import { ResponseHandler } from '../../utils/ResponseHandler';
import { ApiError } from '../../types/ApiError';
import { HttpStatusCode } from '../../types/common';

describe('ResponseHandler', () => {
   let mockRes: any;

   beforeEach(() => {
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
         send: jest.fn().mockReturnThis(),
         req: {
            originalUrl: '/api/test',
         },
      };
      jest.clearAllMocks();
   });

   describe('success', () => {
      it('should send successful response with default message', () => {
         const data = { id: 1, name: 'Test' };
         ResponseHandler.success(mockRes, data);

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.OK);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               success: true,
               data,
               message: 'Success',
               statusCode: HttpStatusCode.OK,
               path: '/api/test',
               timestamp: expect.any(String),
            })
         );
      });

      it('should send successful response with custom message', () => {
         const data = { result: 'test' };
         ResponseHandler.success(mockRes, data, 'Custom message');

         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               message: 'Custom message',
            })
         );
      });

      it('should send successful response with custom status code', () => {
         const data = { id: 1 };
         ResponseHandler.success(mockRes, data, 'Created', HttpStatusCode.CREATED);

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.CREATED);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               statusCode: HttpStatusCode.CREATED,
            })
         );
      });

      it('should include timestamp in ISO format', () => {
         const data = { id: 1 };
         ResponseHandler.success(mockRes, data);

         const callArgs = mockRes.json.mock.calls[0][0];
         expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
   });

   describe('paginated', () => {
      it('should send paginated response', () => {
         const data = [{ id: 1 }, { id: 2 }];
         const pagination = {
            currentPage: 1,
            totalPages: 5,
            totalItems: 10,
            itemsPerPage: 2,
            hasNextPage: true,
            hasPreviousPage: false,
         };

         ResponseHandler.paginated(mockRes, data, pagination);

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.OK);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               success: true,
               data,
               pagination,
               statusCode: HttpStatusCode.OK,
               path: '/api/test',
               timestamp: expect.any(String),
            })
         );
      });

      it('should use default message for paginated response', () => {
         const data = [{ id: 1 }];
         const pagination = {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPreviousPage: false,
         };

         ResponseHandler.paginated(mockRes, data, pagination);

         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               message: 'Success',
            })
         );
      });
   });

   describe('error', () => {
      it('should send error response from ApiError', () => {
         const apiError = ApiError.notFound('Resource', '/api/resource');
         ResponseHandler.error(mockRes, apiError);

         expect(mockRes.status).toHaveBeenCalledWith(apiError.statusCode);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               success: false,
               error: apiError.message,
               statusCode: apiError.statusCode,
            })
         );
      });

      it('should use provided path from ApiError', () => {
         const apiError = ApiError.validationError('Invalid data', '/api/validate');
         ResponseHandler.error(mockRes, apiError);

         const callArgs = mockRes.json.mock.calls[0][0];
         expect(callArgs.path).toBe('/api/validate');
      });
   });

   describe('validationError', () => {
      it('should send validation error response', () => {
         ResponseHandler.validationError(mockRes, 'Invalid input');

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               success: false,
               error: 'Invalid input',
               statusCode: HttpStatusCode.BAD_REQUEST,
            })
         );
      });

      it('should use custom path when provided', () => {
         ResponseHandler.validationError(mockRes, 'Invalid data', '/custom/path');

         const callArgs = mockRes.json.mock.calls[0][0];
         expect(callArgs.path).toBe('/custom/path');
      });
   });

   describe('notFound', () => {
      it('should send not found error response', () => {
         ResponseHandler.notFound(mockRes, 'AudioBook');

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.NOT_FOUND);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               success: false,
               statusCode: HttpStatusCode.NOT_FOUND,
            })
         );
      });
   });

   describe('unauthorized', () => {
      it('should send unauthorized error response', () => {
         ResponseHandler.unauthorized(mockRes);

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               error: 'Unauthorized access',
               statusCode: HttpStatusCode.UNAUTHORIZED,
            })
         );
      });

      it('should send custom unauthorized message', () => {
         ResponseHandler.unauthorized(mockRes, 'Invalid token');

         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               error: 'Invalid token',
            })
         );
      });
   });

   describe('forbidden', () => {
      it('should send forbidden error response', () => {
         ResponseHandler.forbidden(mockRes);

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.FORBIDDEN);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               error: 'Access forbidden',
               statusCode: HttpStatusCode.FORBIDDEN,
            })
         );
      });

      it('should send custom forbidden message', () => {
         ResponseHandler.forbidden(mockRes, 'Insufficient permissions');

         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               error: 'Insufficient permissions',
            })
         );
      });
   });

   describe('conflict', () => {
      it('should send conflict error response', () => {
         ResponseHandler.conflict(mockRes, 'Resource already exists');

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.CONFLICT);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               error: 'Resource already exists',
               statusCode: HttpStatusCode.CONFLICT,
            })
         );
      });
   });

   describe('internalError', () => {
      it('should send internal server error response', () => {
         ResponseHandler.internalError(mockRes);

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               error: 'Internal server error',
               statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
            })
         );
      });

      it('should send custom internal error message', () => {
         ResponseHandler.internalError(mockRes, 'Database connection failed');

         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               error: 'Database connection failed',
            })
         );
      });
   });

   describe('noContent', () => {
      it('should send no content response', () => {
         ResponseHandler.noContent(mockRes);

         expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.NO_CONTENT);
         expect(mockRes.send).toHaveBeenCalled();
         expect(mockRes.json).not.toHaveBeenCalled();
      });
   });

   describe('calculatePagination', () => {
      it('should calculate pagination for first page', () => {
         const result = ResponseHandler.calculatePagination(1, 10, 50);

         expect(result.currentPage).toBe(1);
         expect(result.totalPages).toBe(5);
         expect(result.totalItems).toBe(50);
         expect(result.itemsPerPage).toBe(10);
         expect(result.hasNextPage).toBe(true);
         expect(result.hasPreviousPage).toBe(false);
      });

      it('should calculate pagination for middle page', () => {
         const result = ResponseHandler.calculatePagination(3, 10, 50);

         expect(result.currentPage).toBe(3);
         expect(result.hasNextPage).toBe(true);
         expect(result.hasPreviousPage).toBe(true);
      });

      it('should calculate pagination for last page', () => {
         const result = ResponseHandler.calculatePagination(5, 10, 50);

         expect(result.hasNextPage).toBe(false);
         expect(result.hasPreviousPage).toBe(true);
      });

      it('should handle zero total items', () => {
         const result = ResponseHandler.calculatePagination(1, 10, 0);

         expect(result.totalPages).toBe(0);
         expect(result.hasNextPage).toBe(false);
         expect(result.hasPreviousPage).toBe(false);
      });

      it('should handle single item', () => {
         const result = ResponseHandler.calculatePagination(1, 10, 1);

         expect(result.totalPages).toBe(1);
         expect(result.hasNextPage).toBe(false);
         expect(result.hasPreviousPage).toBe(false);
      });

      it('should round up total pages correctly', () => {
         const result = ResponseHandler.calculatePagination(1, 10, 51);

         expect(result.totalPages).toBe(6);
      });

      it('should handle exact page boundaries', () => {
         const result = ResponseHandler.calculatePagination(5, 10, 50);

         expect(result.totalPages).toBe(5);
         expect(result.hasNextPage).toBe(false);
      });
   });

   describe('Edge Cases', () => {
      it('should handle empty data array', () => {
         ResponseHandler.success(mockRes, []);

         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               data: [],
            })
         );
      });

      it('should handle null data', () => {
         ResponseHandler.success(mockRes, null);

         expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
               data: null,
            })
         );
      });

      it('should handle very large pagination values', () => {
         const result = ResponseHandler.calculatePagination(100, 100, 10000);

         expect(result.totalPages).toBe(100);
         expect(result.currentPage).toBe(100);
      });

      it('should return res object for chaining', () => {
         const result = ResponseHandler.success(mockRes, { id: 1 });

         expect(result).toBe(mockRes);
      });
   });
});

