/**
 * Resolve UserProfile.id from the authenticated JWT user (external auth-service id).
 */
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../types/ApiError';
import { AuthenticatedRequest } from '../types/auth';
import { MessageHandler } from './MessageHandler';

export async function resolveUserProfileId(
   prisma: PrismaClient,
   req: Request
): Promise<string> {
   const authReq = req as AuthenticatedRequest;
   const externalUserId = authReq.user?.id;
   if (!externalUserId) {
      throw ApiError.unauthorized(
         MessageHandler.getErrorMessage('unauthorized.not_authenticated')
      );
   }
   const profile = await prisma.userProfile.findUnique({
      where: { userId: externalUserId },
      select: { id: true },
   });
   if (!profile) {
      throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.user'));
   }
   return profile.id;
}
