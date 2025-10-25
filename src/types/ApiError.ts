/**
 * Custom API Error class for consistent error handling
 * Follows OOP principles with inheritance and encapsulation
 */
import { HttpStatusCode, ErrorType } from './common';

export class ApiError extends Error {
   public readonly statusCode: HttpStatusCode;
   public readonly errorType: ErrorType;
   public readonly isOperational: boolean;
   public readonly timestamp: string;
   public readonly path?: string;

   constructor(
      message: string,
      statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
      errorType: ErrorType = ErrorType.INTERNAL_ERROR,
      isOperational: boolean = true,
      path?: string
   ) {
      super(message);

      // Maintains proper stack trace for where our error was thrown
      Error.captureStackTrace(this, this.constructor);

      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.errorType = errorType;
      this.isOperational = isOperational;
      this.timestamp = new Date().toISOString();
      this.path = path || '';
   }

   /**
    * Create a validation error
    */
   static validationError(message: string, path?: string): ApiError {
      return new ApiError(
         message,
         HttpStatusCode.BAD_REQUEST,
         ErrorType.VALIDATION_ERROR,
         true,
         path
      );
   }

   /**
    * Create a not found error
    */
   static notFound(resource: string, path?: string): ApiError {
      return new ApiError(
         `${resource} not found`,
         HttpStatusCode.NOT_FOUND,
         ErrorType.NOT_FOUND,
         true,
         path
      );
   }

   /**
    * Create an unauthorized error
    */
   static unauthorized(message: string = 'Unauthorized access', path?: string): ApiError {
      return new ApiError(
         message,
         HttpStatusCode.UNAUTHORIZED,
         ErrorType.UNAUTHORIZED,
         true,
         path
      );
   }

   /**
    * Create a forbidden error
    */
   static forbidden(message: string = 'Access forbidden', path?: string): ApiError {
      return new ApiError(
         message,
         HttpStatusCode.FORBIDDEN,
         ErrorType.FORBIDDEN,
         true,
         path
      );
   }

   /**
    * Create a conflict error
    */
   static conflict(message: string, path?: string): ApiError {
      return new ApiError(
         message,
         HttpStatusCode.CONFLICT,
         ErrorType.CONFLICT,
         true,
         path
      );
   }

   /**
    * Create an internal server error
    */
   static internalError(message: string = 'Internal server error', path?: string): ApiError {
      return new ApiError(
         message,
         HttpStatusCode.INTERNAL_SERVER_ERROR,
         ErrorType.INTERNAL_ERROR,
         true,
         path
      );
   }

   /**
    * Convert error to JSON format for API responses
    */
   toJSON(): object {
      return {
         name: this.name,
         message: this.message,
         statusCode: this.statusCode,
         errorType: this.errorType,
         timestamp: this.timestamp,
         path: this.path,
         stack: process.env['NODE_ENV'] === 'development' ? this.stack : undefined
      };
   }
}
