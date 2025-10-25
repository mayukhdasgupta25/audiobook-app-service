/**
 * Response utility class for consistent API responses
 * Follows OOP principles with static methods for different response types
 */
import { Response } from 'express';
import { ApiResponse, PaginatedResponse, HttpStatusCode } from '../types/common';
import { ApiError } from '../types/ApiError';

export class ResponseHandler {
   /**
    * Send a successful response with data
    */
   static success<T>(
      res: Response,
      data: T,
      message: string = 'Success',
      statusCode: HttpStatusCode = HttpStatusCode.OK
   ): Response {
      const response: ApiResponse<T> = {
         success: true,
         data,
         message,
         statusCode,
         timestamp: new Date().toISOString(),
         path: res.req.originalUrl
      };

      return res.status(statusCode).json(response);
   }

   /**
    * Send a successful response with paginated data
    */
   static paginated<T>(
      res: Response,
      data: T[],
      pagination: {
         currentPage: number;
         totalPages: number;
         totalItems: number;
         itemsPerPage: number;
         hasNextPage: boolean;
         hasPreviousPage: boolean;
      },
      message: string = 'Success'
   ): Response {
      const response: PaginatedResponse<T> = {
         success: true,
         data,
         message,
         statusCode: HttpStatusCode.OK,
         timestamp: new Date().toISOString(),
         path: res.req.originalUrl,
         pagination
      };

      return res.status(HttpStatusCode.OK).json(response);
   }

   /**
    * Send an error response
    */
   static error(res: Response, error: ApiError): Response {
      const response: ApiResponse = {
         success: false,
         error: error.message,
         statusCode: error.statusCode,
         timestamp: error.timestamp,
         path: error.path || res.req.originalUrl
      };

      return res.status(error.statusCode).json(response);
   }

   /**
    * Send a validation error response
    */
   static validationError(
      res: Response,
      message: string,
      path?: string
   ): Response {
      const error = ApiError.validationError(message, path);
      return this.error(res, error);
   }

   /**
    * Send a not found error response
    */
   static notFound(
      res: Response,
      resource: string,
      path?: string
   ): Response {
      const error = ApiError.notFound(resource, path);
      return this.error(res, error);
   }

   /**
    * Send an unauthorized error response
    */
   static unauthorized(
      res: Response,
      message: string = 'Unauthorized access',
      path?: string
   ): Response {
      const error = ApiError.unauthorized(message, path);
      return this.error(res, error);
   }

   /**
    * Send a forbidden error response
    */
   static forbidden(
      res: Response,
      message: string = 'Access forbidden',
      path?: string
   ): Response {
      const error = ApiError.forbidden(message, path);
      return this.error(res, error);
   }

   /**
    * Send a conflict error response
    */
   static conflict(
      res: Response,
      message: string,
      path?: string
   ): Response {
      const error = ApiError.conflict(message, path);
      return this.error(res, error);
   }

   /**
    * Send an internal server error response
    */
   static internalError(
      res: Response,
      message: string = 'Internal server error',
      path?: string
   ): Response {
      const error = ApiError.internalError(message, path);
      return this.error(res, error);
   }

   /**
    * Send a no content response
    */
   static noContent(res: Response): Response {
      return res.status(HttpStatusCode.NO_CONTENT).send();
   }

   /**
    * Calculate pagination metadata
    */
   static calculatePagination(
      currentPage: number,
      itemsPerPage: number,
      totalItems: number
   ): {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
   } {
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;

      return {
         currentPage,
         totalPages,
         totalItems,
         itemsPerPage,
         hasNextPage,
         hasPreviousPage
      };
   }
}
