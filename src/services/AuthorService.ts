/**
 * Author Service Layer
 * Handles business logic and database operations for author management following OOP principles
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
   AuthorDto,
   CreateAuthorDto,
   UpdateAuthorDto,
   authorInclude,
   toAuthorDto,
} from '../models/AuthorDto';
import { AuthorCreationMessage } from '../types/author-events';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

export class AuthorService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   private async syncAuthorOrganizations(
      authorId: string,
      organizationIds?: string[]
   ): Promise<void> {
      if (organizationIds === undefined) {
         return;
      }

      const uniqueIds = [...new Set(organizationIds.map((id) => id.trim()).filter(Boolean))];

      if (uniqueIds.length > 0) {
         const organizations = await this.prisma.organization.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true },
         });

         if (organizations.length !== uniqueIds.length) {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.organization_not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }
      }

      await this.prisma.authorOrganization.deleteMany({ where: { authorId } });

      if (uniqueIds.length > 0) {
         await this.prisma.authorOrganization.createMany({
            data: uniqueIds.map((organizationId) => ({
               authorId,
               organizationId,
            })),
         });
      }
   }

   private async getAuthorRecord(id: string) {
      const author = await this.prisma.author.findUnique({
         where: { id },
         include: authorInclude,
      });
      if (!author) {
         throw new ApiError(
            MessageHandler.getErrorMessage('authors.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }
      return author;
   }

   async getAllAuthors(): Promise<AuthorDto[]> {
      try {
         const authors = await this.prisma.author.findMany({
            include: authorInclude,
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
         });

         return authors.map((author) => toAuthorDto(author));
      } catch (_error) {
         throw new ApiError(
            MessageHandler.getErrorMessage('authors.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   async getAuthorById(id: string): Promise<AuthorDto> {
      try {
         const author = await this.getAuthorRecord(id);
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

   async createAuthorFromEvent(message: AuthorCreationMessage): Promise<AuthorDto | null> {
      if (!message.userId || typeof message.userId !== 'string') {
         throw new Error('Invalid message: userId is required and must be a string');
      }

      if (!message.firstName || typeof message.firstName !== 'string') {
         throw new Error('Invalid message: firstName is required and must be a string');
      }

      if (!message.lastName || typeof message.lastName !== 'string') {
         throw new Error('Invalid message: lastName is required and must be a string');
      }

      if (!message.address || typeof message.address !== 'string') {
         throw new Error('Invalid message: address is required and must be a string');
      }

      const existingAuthor = await this.prisma.author.findUnique({
         where: { userId: message.userId },
      });

      if (existingAuthor) {
         console.log(`Author already exists for userId: ${message.userId}, skipping creation`);
         return toAuthorDto(existingAuthor);
      }

      const author = await this.prisma.author.create({
         data: {
            userId: message.userId,
            firstName: message.firstName.trim(),
            lastName: message.lastName.trim(),
            address: message.address.trim(),
            contact:
               message.contact !== undefined && message.contact.trim().length > 0
                  ? message.contact.trim()
                  : null,
         },
      });

      return toAuthorDto(author);
   }

   async createAuthor(createAuthorDto: CreateAuthorDto): Promise<AuthorDto> {
      try {
         if (!createAuthorDto.userId || createAuthorDto.userId.trim().length === 0) {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.author_user_id_required'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

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

         const trimmedUserId = createAuthorDto.userId.trim();
         const trimmedFirstName = createAuthorDto.firstName.trim();
         const trimmedLastName = createAuthorDto.lastName.trim();
         const trimmedAddress = createAuthorDto.address?.trim();
         const trimmedContact = createAuthorDto.contact?.trim();

         const existingAuthor = await this.prisma.author.findUnique({
            where: { userId: trimmedUserId },
         });

         if (existingAuthor) {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.user_id_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }

         const author = await this.prisma.author.create({
            data: {
               userId: trimmedUserId,
               firstName: trimmedFirstName,
               lastName: trimmedLastName,
               address: trimmedAddress && trimmedAddress.length > 0 ? trimmedAddress : null,
               contact: trimmedContact && trimmedContact.length > 0 ? trimmedContact : null,
            },
         });

         await this.syncAuthorOrganizations(author.id, createAuthorDto.organizationIds);

         const created = await this.getAuthorRecord(author.id);
         return toAuthorDto(created);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.user_id_exists'),
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

   async updateAuthor(id: string, updateAuthorDto: UpdateAuthorDto): Promise<AuthorDto> {
      try {
         const existingAuthor = await this.prisma.author.findUnique({ where: { id } });

         if (!existingAuthor) {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         const updateData: Prisma.AuthorUpdateInput = {};

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

         if (updateAuthorDto.address !== undefined) {
            const trimmed = updateAuthorDto.address.trim();
            updateData.address = trimmed.length > 0 ? trimmed : null;
         }

         if (updateAuthorDto.contact !== undefined) {
            const trimmed = updateAuthorDto.contact.trim();
            updateData.contact = trimmed.length > 0 ? trimmed : null;
         }

         const hasScalarUpdates = Object.keys(updateData).length > 0;
         const hasOrgUpdates = updateAuthorDto.organizationIds !== undefined;

         if (!hasScalarUpdates && !hasOrgUpdates) {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.no_update_fields'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         if (hasScalarUpdates) {
            await this.prisma.author.update({
               where: { id },
               data: updateData,
            });
         }

         await this.syncAuthorOrganizations(id, updateAuthorDto.organizationIds);

         const updated = await this.getAuthorRecord(id);
         return toAuthorDto(updated);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         throw new ApiError(
            MessageHandler.getErrorMessage('authors.update_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   async deleteAuthor(id: string): Promise<void> {
      try {
         const existingAuthor = await this.prisma.author.findUnique({ where: { id } });

         if (!existingAuthor) {
            throw new ApiError(
               MessageHandler.getErrorMessage('authors.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         await this.prisma.author.delete({ where: { id } });
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
