/**
 * Organization Service Layer
 *
 * Encapsulates all business logic around organizations and their members:
 *  - CRUD on organizations
 *  - Membership management (add / remove / role updates)
 *  - Access checks used by other services (e.g. AudioBookService)
 *
 * An audiobook always belongs to a single organization, and a user can
 * only see audiobooks of organizations they are a member of.
 */
import { OrganizationTeamSize, Prisma, PrismaClient, OrganizationRole } from '@prisma/client';
import {
   OrganizationDto,
   OrganizationMemberDto,
   OrganizationTeamSizeType,
   CreateOrganizationDto,
   UpdateOrganizationDto,
   parseTeamSizeFromApi,
   toOrganizationDto,
   toOrganizationMemberDto,
} from '../models/OrganizationDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { fileUrlService } from './FileUrlService';
import {
   isGlobalAdminRole,
   isGlobalAuthorRole,
   isOrgAdminRole,
   isOrgCoordinatorRole,
} from '../constants/authRoles';

export function hasOwnerTierOrgAccess(
   jwtRole: string | undefined,
   membershipRole: OrganizationRole | null,
): boolean {
   if (isGlobalAdminRole(jwtRole)) {
      return true;
   }
   return isOrgAdminRole(jwtRole) && membershipRole === OrganizationRole.OWNER;
}

export function hasCoordinatorTierOrgAccess(
   jwtRole: string | undefined,
   membershipRole: OrganizationRole | null,
): boolean {
   if (isGlobalAdminRole(jwtRole)) {
      return true;
   }
   return (
      isOrgCoordinatorRole(jwtRole) && membershipRole === OrganizationRole.ADMIN
   );
}

export function hasOrgStaffAccess(
   jwtRole: string | undefined,
   membershipRole: OrganizationRole | null,
): boolean {
   return (
      hasOwnerTierOrgAccess(jwtRole, membershipRole) ||
      hasCoordinatorTierOrgAccess(jwtRole, membershipRole)
   );
}

export class OrganizationService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Create a new organization. If `creatorUserProfileId` is provided, that
    * user is automatically added as the OWNER of the organization in the
    * same database transaction.
    */
   async createOrganization(
      data: CreateOrganizationDto,
      creatorUserProfileId?: string
   ): Promise<OrganizationDto> {
      const name = data.name?.trim();
      if (!name) {
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('organizations.name_required')
         );
      }
      if (name.length > 100) {
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('organizations.name_too_long')
         );
      }

      const slug = this.normalizeSlug(data.slug || name);
      if (!slug) {
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('organizations.slug_invalid')
         );
      }

      const preferredGenreName = this.normalizePreferredGenreName(data.preferredGenre);
      const websiteUrl = this.normalizeWebsiteUrl(data.websiteUrl);
      const teamSize = this.normalizeTeamSize(data.teamSize);

      try {
         const organization = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.organization.findUnique({
               where: { slug },
            });
            if (existing) {
               throw ApiError.conflict(
                  MessageHandler.getErrorMessage('organizations.slug_exists')
               );
            }

            const preferredGenre = preferredGenreName
               ? await this.resolvePreferredGenreName(tx, preferredGenreName)
               : null;

            const created = await tx.organization.create({
               data: {
                  name,
                  slug,
                  description: data.description?.trim() || null,
                  image: data.image ?? null,
                  preferredGenre,
                  websiteUrl,
                  teamSize,
               },
            });

            if (creatorUserProfileId) {
               await tx.organizationMember.create({
                  data: {
                     organizationId: created.id,
                     userProfileId: creatorUserProfileId,
                     role: OrganizationRole.OWNER,
                  },
               });
            }

            return created;
         });

         return fileUrlService.resolveOrganizationMedia(toOrganizationDto(organization));
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
               throw ApiError.conflict(
                  MessageHandler.getErrorMessage('organizations.slug_exists')
               );
            }
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.create_failed')
         );
      }
   }

   /**
    * Get a paginated list of all organizations.
    */
   async listOrganizations(params: { page?: number; limit?: number } = {}): Promise<{
      organizations: OrganizationDto[];
      totalCount: number;
   }> {
      const page = Math.max(1, params.page ?? 1);
      const limit = Math.min(100, Math.max(1, params.limit ?? 10));
      const skip = (page - 1) * limit;

      try {
         const [organizations, totalCount] = await Promise.all([
            this.prisma.organization.findMany({
               skip,
               take: limit,
               orderBy: { name: 'asc' },
               include: { _count: { select: { members: true } } },
            }),
            this.prisma.organization.count(),
         ]);

         const dtos = organizations.map(toOrganizationDto);
         return {
            organizations: await fileUrlService.resolveOrganizationMediaList(dtos),
            totalCount,
         };
      } catch (_error) {
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.fetch_failed')
         );
      }
   }

   /**
    * Get organizations a given user profile is a member of.
    */
   async getOrganizationsForUser(userProfileId: string): Promise<OrganizationMemberDto[]> {
      try {
         const memberships = await this.prisma.organizationMember.findMany({
            where: { userProfileId },
            include: { organization: true },
            orderBy: { joinedAt: 'desc' },
         });
         const memberDtos = memberships.map(toOrganizationMemberDto);
         return Promise.all(
            memberDtos.map(async (member) => {
               if (!member.organization) {
                  return member;
               }
               const organization = await fileUrlService.resolveOrganizationMedia(member.organization);
               return { ...member, organization };
            })
         );
      } catch (_error) {
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.fetch_failed')
         );
      }
   }

   /**
    * Get an organization by id, throwing if not found.
    */
   async getOrganizationById(id: string): Promise<OrganizationDto> {
      try {
         const organization = await this.prisma.organization.findUnique({
            where: { id },
            include: { _count: { select: { members: true } } },
         });
         if (!organization) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('organizations.not_found')
            );
         }
         return fileUrlService.resolveOrganizationMedia(toOrganizationDto(organization));
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.fetch_failed')
         );
      }
   }

   /**
    * Update an organization's mutable fields. Slug uniqueness is enforced.
    */
   async updateOrganization(
      id: string,
      data: UpdateOrganizationDto
   ): Promise<OrganizationDto> {
      const updates: Prisma.OrganizationUpdateInput = {};

      if (data.name !== undefined) {
         const name = data.name.trim();
         if (!name) {
            throw ApiError.validationError(
               MessageHandler.getErrorMessage('organizations.name_required')
            );
         }
         if (name.length > 100) {
            throw ApiError.validationError(
               MessageHandler.getErrorMessage('organizations.name_too_long')
            );
         }
         updates.name = name;
      }

      if (data.slug !== undefined) {
         const slug = this.normalizeSlug(data.slug);
         if (!slug) {
            throw ApiError.validationError(
               MessageHandler.getErrorMessage('organizations.slug_invalid')
            );
         }
         updates.slug = slug;
      }

      if (data.description !== undefined) {
         updates.description = data.description.trim() || null;
      }

      if (data.image !== undefined) {
         updates.image = data.image;
      }

      if (data.preferredGenre !== undefined) {
         const preferredGenreName = this.normalizePreferredGenreName(data.preferredGenre);
         updates.preferredGenre = preferredGenreName
            ? await this.resolvePreferredGenreName(this.prisma, preferredGenreName)
            : null;
      }

      if (data.websiteUrl !== undefined) {
         updates.websiteUrl = this.normalizeWebsiteUrl(data.websiteUrl);
      }

      if (data.teamSize !== undefined) {
         updates.teamSize = this.normalizeTeamSize(data.teamSize);
      }

      if (Object.keys(updates).length === 0) {
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('validation.no_update_fields')
         );
      }

      try {
         const existing = await this.prisma.organization.findUnique({
            where: { id },
         });
         if (!existing) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('organizations.not_found')
            );
         }

         const updated = await this.prisma.organization.update({
            where: { id },
            data: updates,
         });

         return fileUrlService.resolveOrganizationMedia(toOrganizationDto(updated));
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
               throw ApiError.conflict(
                  MessageHandler.getErrorMessage('organizations.slug_exists')
               );
            }
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.update_failed')
         );
      }
   }

   /**
    * Delete an organization. Cascades to members and audiobooks via DB FKs.
    */
   async deleteOrganization(id: string): Promise<void> {
      try {
         const existing = await this.prisma.organization.findUnique({
            where: { id },
         });
         if (!existing) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('organizations.not_found')
            );
         }

         await this.prisma.organization.delete({ where: { id } });
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.delete_failed')
         );
      }
   }

   /**
    * Add a user to an organization. The optional `role` defaults to ADMIN.
    */
   async addMember(
      organizationId: string,
      userProfileId: string,
      role: OrganizationRole = OrganizationRole.ADMIN
   ): Promise<OrganizationMemberDto> {
      try {
         const [organization, userProfile] = await Promise.all([
            this.prisma.organization.findUnique({ where: { id: organizationId } }),
            this.prisma.userProfile.findUnique({ where: { id: userProfileId } }),
         ]);

         if (!organization) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('organizations.not_found')
            );
         }
         if (!userProfile) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('not_found.user')
            );
         }

         const existing = await this.prisma.organizationMember.findUnique({
            where: {
               userProfileId_organizationId: {
                  userProfileId,
                  organizationId,
               },
            },
         });
         if (existing) {
            throw ApiError.conflict(
               MessageHandler.getErrorMessage('organizations.member_exists')
            );
         }

         const member = await this.prisma.organizationMember.create({
            data: { organizationId, userProfileId, role },
            include: { organization: true },
         });

         const dto = toOrganizationMemberDto(member);
         if (dto.organization) {
            dto.organization = await fileUrlService.resolveOrganizationMedia(dto.organization);
         }
         return dto;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
               throw ApiError.conflict(
                  MessageHandler.getErrorMessage('organizations.member_exists')
               );
            }
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.add_member_failed')
         );
      }
   }

   /**
    * List members of an organization.
    */
   async listMembers(organizationId: string): Promise<OrganizationMemberDto[]> {
      try {
         const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
         });
         if (!organization) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('organizations.not_found')
            );
         }
         const members = await this.prisma.organizationMember.findMany({
            where: { organizationId },
            include: { organization: true },
            orderBy: { joinedAt: 'asc' },
         });
         return members.map(toOrganizationMemberDto);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.fetch_members_failed')
         );
      }
   }

   /**
    * Update a member's role within an organization.
    * The last remaining OWNER cannot be demoted - that prevents an
    * organization from being left orphaned.
    */
   async updateMemberRole(
      organizationId: string,
      userProfileId: string,
      role: OrganizationRole
   ): Promise<OrganizationMemberDto> {
      try {
         const member = await this.prisma.organizationMember.findUnique({
            where: {
               userProfileId_organizationId: { userProfileId, organizationId },
            },
         });
         if (!member) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('organizations.member_not_found')
            );
         }

         if (
            member.role === OrganizationRole.OWNER &&
            role !== OrganizationRole.OWNER
         ) {
            const ownerCount = await this.prisma.organizationMember.count({
               where: { organizationId, role: OrganizationRole.OWNER },
            });
            if (ownerCount <= 1) {
               throw ApiError.validationError(
                  MessageHandler.getErrorMessage('organizations.last_owner')
               );
            }
         }

         const updated = await this.prisma.organizationMember.update({
            where: {
               userProfileId_organizationId: { userProfileId, organizationId },
            },
            data: { role },
            include: { organization: true },
         });

         const dto = toOrganizationMemberDto(updated);
         if (dto.organization) {
            dto.organization = await fileUrlService.resolveOrganizationMedia(dto.organization);
         }
         return dto;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.update_member_failed')
         );
      }
   }

   /**
    * Remove a user from an organization. The last remaining OWNER cannot be
    * removed - the caller must first promote another member to OWNER or
    * delete the organization.
    */
   async removeMember(organizationId: string, userProfileId: string): Promise<void> {
      try {
         const member = await this.prisma.organizationMember.findUnique({
            where: {
               userProfileId_organizationId: { userProfileId, organizationId },
            },
         });
         if (!member) {
            throw ApiError.notFound(
               MessageHandler.getErrorMessage('organizations.member_not_found')
            );
         }

         if (member.role === OrganizationRole.OWNER) {
            const ownerCount = await this.prisma.organizationMember.count({
               where: { organizationId, role: OrganizationRole.OWNER },
            });
            if (ownerCount <= 1) {
               throw ApiError.validationError(
                  MessageHandler.getErrorMessage('organizations.last_owner')
               );
            }
         }

         await this.prisma.organizationMember.delete({
            where: {
               userProfileId_organizationId: { userProfileId, organizationId },
            },
         });
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw ApiError.internalError(
            MessageHandler.getErrorMessage('organizations.remove_member_failed')
         );
      }
   }

   /**
    * Returns the role of `userProfileId` in `organizationId`, or null if the
    * user is not a member. Useful for access control without throwing.
    */
   async getMemberRole(
      organizationId: string,
      userProfileId: string
   ): Promise<OrganizationRole | null> {
      const member = await this.prisma.organizationMember.findUnique({
         where: {
            userProfileId_organizationId: { userProfileId, organizationId },
         },
         select: { role: true },
      });
      return member?.role ?? null;
   }

   /**
    * Returns whether the organization has at least one member.
    */
   async hasMembers(organizationId: string): Promise<boolean> {
      const count = await this.prisma.organizationMember.count({
         where: { organizationId },
      });
      return count > 0;
   }

   /**
    * Convenience boolean check that the user has any membership in an org.
    */
   async isMember(organizationId: string, userProfileId: string): Promise<boolean> {
      return (await this.getMemberRole(organizationId, userProfileId)) !== null;
   }

   /**
    * Check whether the user has org staff privileges (owner or coordinator tier).
    */
   async hasOrgStaffAccess(
      organizationId: string,
      userProfileId: string,
      jwtRole: string | undefined,
   ): Promise<boolean> {
      const membershipRole = await this.getMemberRole(organizationId, userProfileId);
      return hasOrgStaffAccess(jwtRole, membershipRole);
   }

   /**
    * Check whether the user has owner-tier privileges in an org.
    */
   async hasOwnerTierAccess(
      organizationId: string,
      userProfileId: string,
      jwtRole: string | undefined,
   ): Promise<boolean> {
      const membershipRole = await this.getMemberRole(organizationId, userProfileId);
      return hasOwnerTierOrgAccess(jwtRole, membershipRole);
   }

   /**
    * Check whether the auth user has an Author profile linked to the organization.
    */
   async isAuthorLinkedToOrganization(authUserId: string, organizationId: string): Promise<boolean> {
      const author = await this.prisma.author.findUnique({
         where: { userId: authUserId },
         select: { id: true },
      });

      if (!author) {
         return false;
      }

      const link = await this.prisma.authorOrganization.findUnique({
         where: {
            authorId_organizationId: {
               authorId: author.id,
               organizationId,
            },
         },
         select: { id: true },
      });

      return link !== null;
   }

   /**
    * Whether the caller may create an audiobook in the target organization.
    */
   async canCreateAudiobook(
      authUserId: string | undefined,
      userProfileId: string | undefined,
      organizationId: string | null | undefined,
      jwtRole: string | undefined,
   ): Promise<boolean> {
      if (!organizationId) {
         return Boolean(authUserId);
      }

      if (isGlobalAdminRole(jwtRole)) {
         return true;
      }

      if (
         userProfileId &&
         (await this.hasOrgStaffAccess(organizationId, userProfileId, jwtRole))
      ) {
         return true;
      }

      if (authUserId && isGlobalAuthorRole(jwtRole)) {
         return this.isAuthorLinkedToOrganization(authUserId, organizationId);
      }

      return false;
   }

   /**
    * Whether the caller may create a chapter for the target audiobook.
    * Resolves the audiobook's organization and delegates to canCreateAudiobook.
    */
   async canCreateChapter(
      authUserId: string | undefined,
      userProfileId: string | undefined,
      audiobookId: string,
      jwtRole: string | undefined,
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
            allowed: Boolean(authUserId),
            organizationId: null,
         };
      }

      const allowed = await this.canCreateAudiobook(
         authUserId,
         userProfileId,
         audiobook.organizationId,
         jwtRole,
      );

      return { audiobookExists: true, allowed, organizationId: audiobook.organizationId };
   }

   /**
    * Get all organization IDs a user is a member of. Used by other services
    * (e.g. AudioBookService) to scope queries.
    */
   async getOrganizationIdsForUser(userProfileId: string): Promise<string[]> {
      const memberships = await this.prisma.organizationMember.findMany({
         where: { userProfileId },
         select: { organizationId: true },
      });
      return memberships.map((m) => m.organizationId);
   }

   /**
    * Normalize a free-form string into a URL-safe slug.
    *  - lowercased
    *  - non-alphanumerics replaced with hyphens
    *  - duplicate / leading / trailing hyphens stripped
    *  - max length 60
    */
   private normalizeSlug(input: string): string {
      return input
         .toLowerCase()
         .trim()
         .replace(/[^a-z0-9]+/g, '-')
         .replace(/^-+|-+$/g, '')
         .slice(0, 60);
   }

   private normalizePreferredGenreName(
      value: string | null | undefined
   ): string | null {
      if (value === undefined || value === null) {
         return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
   }

   private async resolvePreferredGenreName(
      client: PrismaClient | Prisma.TransactionClient,
      genreName: string
   ): Promise<string> {
      const genre = await client.genre.findFirst({
         where: { name: { equals: genreName, mode: 'insensitive' } },
         select: { name: true },
      });

      if (!genre) {
         throw ApiError.notFound(
            MessageHandler.getErrorMessage('organizations.preferred_genre_not_found')
         );
      }

      return genre.name;
   }

   private normalizeWebsiteUrl(value: string | null | undefined): string | null {
      if (value === undefined || value === null) {
         return null;
      }

      const trimmed = value.trim();
      if (trimmed.length === 0) {
         return null;
      }

      if (trimmed.length > 500) {
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('organizations.website_url_invalid')
         );
      }

      try {
         const parsed = new URL(trimmed);
         if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('invalid protocol');
         }
      } catch {
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('organizations.website_url_invalid')
         );
      }

      return trimmed;
   }

   private normalizeTeamSize(
      value: OrganizationTeamSizeType | null | undefined
   ): OrganizationTeamSize | null {
      if (value === undefined || value === null) {
         return null;
      }

      const trimmed = String(value).trim() as OrganizationTeamSizeType;
      if (trimmed.length === 0) {
         return null;
      }

      try {
         return parseTeamSizeFromApi(trimmed);
      } catch {
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('organizations.team_size_invalid')
         );
      }
   }

}
