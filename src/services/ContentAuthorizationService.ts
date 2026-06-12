import { PrismaClient } from '@prisma/client';
import { authClient } from '../clients/AuthClient';
import {
   isContentCreatorRole,
   isGlobalAdminRole,
   isGlobalAuthorRole,
   isOrgAdminRole,
   isOrgCoordinatorRole,
} from '../constants/authRoles';

type MembershipRole = 'OWNER' | 'ADMIN';

export function hasOwnerTierOrgAccess(
   jwtRole: string | undefined,
   membershipRole: MembershipRole | null,
): boolean {
   if (isGlobalAdminRole(jwtRole)) {
      return true;
   }
   return isOrgAdminRole(jwtRole) && membershipRole === 'OWNER';
}

export function hasCoordinatorTierOrgAccess(
   jwtRole: string | undefined,
   membershipRole: MembershipRole | null,
): boolean {
   if (isGlobalAdminRole(jwtRole)) {
      return true;
   }
   return isOrgCoordinatorRole(jwtRole) && membershipRole === 'ADMIN';
}

export function hasOrgStaffAccess(
   jwtRole: string | undefined,
   membershipRole: MembershipRole | null,
): boolean {
   return (
      hasOwnerTierOrgAccess(jwtRole, membershipRole) ||
      hasCoordinatorTierOrgAccess(jwtRole, membershipRole)
   );
}

export class ContentAuthorizationService {
   constructor(private prisma: PrismaClient) {}

   private normalizeMembershipRole(role: string | undefined): MembershipRole | null {
      if (role === 'OWNER' || role === 'ADMIN') {
         return role;
      }
      return null;
   }

   async hasOrgStaffAccessForUser(
      organizationId: string,
      jwtRole: string | undefined,
      accessToken?: string,
   ): Promise<boolean> {
      if (!accessToken) {
         return false;
      }
      const membership = await authClient.getMembership(organizationId, accessToken);
      if (!membership) {
         return false;
      }
      return hasOrgStaffAccess(jwtRole, this.normalizeMembershipRole(membership.role));
   }

   async isAuthorLinkedToOrganization(
      authUserId: string,
      organizationId: string,
      accessToken?: string,
   ): Promise<boolean> {
      if (!accessToken) {
         return false;
      }
      const author = await authClient.getAuthorByUserId(authUserId, accessToken);
      if (!author) {
         return false;
      }
      return authClient.isAuthorLinkedToOrganization(author.id, organizationId, accessToken);
   }

   async canCreateAudiobook(
      authUserId: string | undefined,
      organizationId: string | null | undefined,
      jwtRole: string | undefined,
      accessToken?: string,
   ): Promise<boolean> {
      if (!authUserId || !isContentCreatorRole(jwtRole)) {
         return false;
      }

      if (!organizationId) {
         return true;
      }

      if (isOrgAdminRole(jwtRole) || isOrgCoordinatorRole(jwtRole)) {
         return this.hasOrgStaffAccessForUser(organizationId, jwtRole, accessToken);
      }

      if (isGlobalAuthorRole(jwtRole)) {
         return this.isAuthorLinkedToOrganization(authUserId, organizationId, accessToken);
      }

      return false;
   }

   async canCreateChapter(
      authUserId: string | undefined,
      audiobookId: string,
      jwtRole: string | undefined,
      accessToken?: string,
   ): Promise<{ audiobookExists: boolean; allowed: boolean; organizationId?: string | null }> {
      const audiobook = await this.prisma.audioBook.findUnique({
         where: { id: audiobookId },
         select: { organizationId: true },
      });

      if (!audiobook) {
         return { audiobookExists: false, allowed: false };
      }

      if (audiobook.organizationId === null) {
         return {
            audiobookExists: true,
            allowed: Boolean(authUserId) && isContentCreatorRole(jwtRole),
            organizationId: null,
         };
      }

      const allowed = await this.canCreateAudiobook(
         authUserId,
         audiobook.organizationId,
         jwtRole,
         accessToken,
      );

      return { audiobookExists: true, allowed, organizationId: audiobook.organizationId };
   }

   async canManageAudiobook(
      authUserId: string | undefined,
      audiobookId: string,
      jwtRole: string | undefined,
      accessToken?: string,
   ): Promise<{ audiobookExists: boolean; allowed: boolean }> {
      const audiobook = await this.prisma.audioBook.findUnique({
         where: { id: audiobookId },
         select: { organizationId: true },
      });

      if (!audiobook) {
         return { audiobookExists: false, allowed: false };
      }

      if (isGlobalAdminRole(jwtRole)) {
         return { audiobookExists: true, allowed: true };
      }

      const allowed = await this.canCreateAudiobook(
         authUserId,
         audiobook.organizationId,
         jwtRole,
         accessToken,
      );

      return { audiobookExists: true, allowed };
   }

   async canManageChapter(
      authUserId: string | undefined,
      chapterId: string,
      jwtRole: string | undefined,
      accessToken?: string,
   ): Promise<{ chapterExists: boolean; allowed: boolean }> {
      const chapter = await this.prisma.chapter.findUnique({
         where: { id: chapterId },
         select: { audiobookId: true },
      });

      if (!chapter) {
         return { chapterExists: false, allowed: false };
      }

      const { audiobookExists, allowed } = await this.canManageAudiobook(
         authUserId,
         chapter.audiobookId,
         jwtRole,
         accessToken,
      );

      return { chapterExists: true, allowed: audiobookExists && allowed };
   }
}
