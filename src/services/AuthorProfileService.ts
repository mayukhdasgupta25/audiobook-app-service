import { PrismaClient } from '@prisma/client';
import { AuthorProfileDto, toAuthorProfileDto, UpdateAuthorProfileDto } from '../models/AuthorProfileDto';
import { AuthorCreationMessage } from '../types/author-events';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';
import { fileUrlService } from './FileUrlService';

export class AuthorProfileService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   async createFromEvent(message: AuthorCreationMessage): Promise<AuthorProfileDto | null> {
      if (!message.authorId || typeof message.authorId !== 'string') {
         throw new Error('Invalid message: authorId is required and must be a string');
      }

      const existing = await this.prisma.authorProfile.findUnique({
         where: { authorId: message.authorId },
      });

      if (existing) {
         return toAuthorProfileDto(existing);
      }

      const profile = await this.prisma.authorProfile.create({
         data: {
            authorId: message.authorId,
            avatar:
               message.avatar !== undefined && message.avatar.trim().length > 0
                  ? message.avatar.trim()
                  : null,
         },
      });

      return fileUrlService.resolveAuthorProfileMedia(toAuthorProfileDto(profile));
   }

   async getByAuthorId(authorId: string): Promise<AuthorProfileDto> {
      const profile = await this.prisma.authorProfile.findUnique({
         where: { authorId },
      });

      if (!profile) {
         throw new ApiError(
            MessageHandler.getErrorMessage('author_profiles.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND,
         );
      }

      return fileUrlService.resolveAuthorProfileMedia(toAuthorProfileDto(profile));
   }

   async updateByAuthorId(authorId: string, data: UpdateAuthorProfileDto): Promise<AuthorProfileDto> {
      const existing = await this.prisma.authorProfile.findUnique({
         where: { authorId },
      });

      if (!existing) {
         throw new ApiError(
            MessageHandler.getErrorMessage('author_profiles.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND,
         );
      }

      const updated = await this.prisma.authorProfile.update({
         where: { authorId },
         data: {
            ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
         },
      });

      return fileUrlService.resolveAuthorProfileMedia(toAuthorProfileDto(updated));
   }

   async deleteByAuthorId(authorId: string): Promise<void> {
      const existing = await this.prisma.authorProfile.findUnique({
         where: { authorId },
      });

      if (!existing) {
         throw new ApiError(
            MessageHandler.getErrorMessage('author_profiles.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND,
         );
      }

      await this.prisma.authorProfile.delete({ where: { authorId } });
   }
}
