/**
 * Listening history service — user audiobook listening records
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
   ListeningHistoryQueryParams,
   ListeningHistoryWithAudiobookDto,
   toListeningHistoryWithAudiobookDto,
} from '../models/ListeningHistoryDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

const audiobookSelect = {
   id: true,
   title: true,
   author: true,
   narrator: true,
   coverImage: true,
   duration: true,
} as const;

export class ListeningHistoryService {
   constructor(private prisma: PrismaClient) {}

   async getListeningHistoryByUserProfileId(
      userProfileId: string,
      query: ListeningHistoryQueryParams
   ): Promise<{ listeningHistory: ListeningHistoryWithAudiobookDto[]; totalCount: number }> {
      const profile = await this.prisma.userProfile.findUnique({
         where: { id: userProfileId },
         select: { id: true },
      });
      if (!profile) {
         throw new ApiError(
            MessageHandler.getErrorMessage('not_found.user'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;
      const sortBy = query.sortBy ?? 'lastListenedAt';
      const sortOrder = query.sortOrder ?? 'desc';

      const where: Prisma.ListeningHistoryWhereInput = { userProfileId };
      if (query.audiobookId) {
         where.audiobookId = query.audiobookId;
      }
      if (query.completed !== undefined) {
         where.completed = query.completed;
      }

      const [rows, totalCount] = await Promise.all([
         this.prisma.listeningHistory.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
               audiobook: {
                  select: audiobookSelect,
               },
            },
         }),
         this.prisma.listeningHistory.count({ where }),
      ]);

      return {
         listeningHistory: rows.map(toListeningHistoryWithAudiobookDto),
         totalCount,
      };
   }
}
