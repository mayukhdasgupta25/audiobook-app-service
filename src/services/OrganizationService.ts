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
import { Prisma, PrismaClient, OrganizationRole } from '@prisma/client';
import {
   OrganizationDto,
   OrganizationMemberDto,
   CreateOrganizationDto,
   UpdateOrganizationDto,
   toOrganizationDto,
   toOrganizationMemberDto,
} from '../models/OrganizationDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';

// Roles that may administer (rename / delete / manage members) an org.
const ADMIN_ROLES: OrganizationRole[] = [
   OrganizationRole.OWNER,
   OrganizationRole.ADMIN,
];

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

            const created = await tx.organization.create({
               data: {
                  name,
                  slug,
                  description: data.description?.trim() || null,
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

         return toOrganizationDto(organization);
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

         return {
            organizations: organizations.map(toOrganizationDto),
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
         return memberships.map(toOrganizationMemberDto);
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
         return toOrganizationDto(organization);
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

         return toOrganizationDto(updated);
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
    * Add a user to an organization. The optional `role` defaults to MEMBER.
    */
   async addMember(
      organizationId: string,
      userProfileId: string,
      role: OrganizationRole = OrganizationRole.MEMBER
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

         return toOrganizationMemberDto(member);
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

         return toOrganizationMemberDto(updated);
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
    * Check whether the user has admin-or-owner privileges in an org.
    */
   async isAdmin(organizationId: string, userProfileId: string): Promise<boolean> {
      const role = await this.getMemberRole(organizationId, userProfileId);
      return role !== null && ADMIN_ROLES.includes(role);
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
}
