/**
 * Author Service Layer
 * Handles business logic and database operations for author management following OOP principles
 */
import { PrismaClient } from '@prisma/client';
import { AuthorDto, CreateAuthorDto, UpdateAuthorDto, toAuthorDto } from '../models/AuthorDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

export class AuthorService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Get all authors
    * Returns all authors sorted by lastName, then firstName in ascending order
    */
   async getAllAuthors(): Promise<AuthorDto[]> {
      try {
         const authors = await this.prisma.author.findMany({
            orderBy: [
               { lastName: 'asc' },
               { firstName: 'asc' }
            ]
         });

         return authors.map(author => toAuthorDto(author));
      } catch (_error) {
         throw new ApiError(
            MessageHandler.getErrorMessage('authors.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get author by ID
    * Returns a specific author by its unique identifier
    */
   async getAuthorById(id: string): Promise<AuthorDto> {
      try {
         const author = await this.prisma.author.findUnique({
            where: { id }
         });

         if (!author) {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         return toAuthorDto(author);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         throw new ApiError(
            MessageHandler.getErrorMessage('authors.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Create a new author
    * Creates an author with validation
    */
   async createAuthor(createAuthorDto: CreateAuthorDto): Promise<AuthorDto> {
      try {
         // Validate required fields
         if (!createAuthorDto.firstName || createAuthorDto.firstName.trim().length === 0) {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.author_first_name_required'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         if (!createAuthorDto.lastName || createAuthorDto.lastName.trim().length === 0) {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.author_last_name_required'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const trimmedFirstName = createAuthorDto.firstName.trim();
         const trimmedLastName = createAuthorDto.lastName.trim();
         const trimmedEmail = createAuthorDto.email?.trim();
         const trimmedAddress = createAuthorDto.address?.trim();
         const trimmedContact = createAuthorDto.contact?.trim();

         // Check email uniqueness if provided
         if (trimmedEmail && trimmedEmail.length > 0) {
            const existingAuthor = await this.prisma.author.findUnique({
               where: { email: trimmedEmail }
            });

            if (existingAuthor) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('authors.email_exists'),
                  HttpStatusCode.CONFLICT,
                  ErrorType.CONFLICT
               );
            }
         }

         const author = await this.prisma.author.create({
            data: {
               firstName: trimmedFirstName,
               lastName: trimmedLastName,
               email: trimmedEmail && trimmedEmail.length > 0 ? trimmedEmail : null,
               address: trimmedAddress && trimmedAddress.length > 0 ? trimmedAddress : null,
               contact: trimmedContact && trimmedContact.length > 0 ? trimmedContact : null
            }
         });

         return toAuthorDto(author);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         // Handle Prisma unique constraint violation
         if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.email_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }

         throw new ApiError(
            MessageHandler.getErrorMessage('authors.create_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Update an existing author
    * Updates an author with validation
    */
   async updateAuthor(id: string, updateAuthorDto: UpdateAuthorDto): Promise<AuthorDto> {
      try {
         // Check if author exists
         const existingAuthor = await this.prisma.author.findUnique({
            where: { id }
         });

         if (!existingAuthor) {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         // Validate and prepare update data
         const updateData: any = {};

         if (updateAuthorDto.firstName !== undefined) {
            const trimmed = updateAuthorDto.firstName.trim();
            if (trimmed.length === 0) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('validation.author_first_name_required'),
                  HttpStatusCode.BAD_REQUEST,
                  ErrorType.VALIDATION_ERROR
               );
            }
            updateData.firstName = trimmed;
         }

         if (updateAuthorDto.lastName !== undefined) {
            const trimmed = updateAuthorDto.lastName.trim();
            if (trimmed.length === 0) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('validation.author_last_name_required'),
                  HttpStatusCode.BAD_REQUEST,
                  ErrorType.VALIDATION_ERROR
               );
            }
            updateData.lastName = trimmed;
         }

         if (updateAuthorDto.email !== undefined) {
            const trimmed = updateAuthorDto.email.trim();
            if (trimmed.length > 0) {
               // Check email uniqueness if email is being changed
               if (trimmed !== existingAuthor.email) {
                  const emailExists = await this.prisma.author.findUnique({
                     where: { email: trimmed }
                  });

                  if (emailExists) {
                     throw new ApiError(
                        MessageHandler.getErrorMessage('authors.email_exists'),
                        HttpStatusCode.CONFLICT,
                        ErrorType.CONFLICT
                     );
                  }
               }
               updateData.email = trimmed;
            } else {
               updateData.email = null;
            }
         }

         if (updateAuthorDto.address !== undefined) {
            const trimmed = updateAuthorDto.address.trim();
            updateData.address = trimmed.length > 0 ? trimmed : null;
         }

         if (updateAuthorDto.contact !== undefined) {
            const trimmed = updateAuthorDto.contact.trim();
            updateData.contact = trimmed.length > 0 ? trimmed : null;
         }

         // Check if there's anything to update
         if (Object.keys(updateData).length === 0) {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.no_update_fields'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const author = await this.prisma.author.update({
            where: { id },
            data: updateData
         });

         return toAuthorDto(author);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         // Handle Prisma unique constraint violation
         if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.email_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }

         throw new ApiError(
            MessageHandler.getErrorMessage('authors.update_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Delete an existing author
    * Deletes an author by its unique identifier
    */
   async deleteAuthor(id: string): Promise<void> {
      try {
         // Check if author exists
         const existingAuthor = await this.prisma.author.findUnique({
            where: { id }
         });

         if (!existingAuthor) {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         await this.prisma.author.delete({
            where: { id }
         });
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         throw new ApiError(
            MessageHandler.getErrorMessage('authors.delete_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }
}

