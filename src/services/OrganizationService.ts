/**
 * Organization Service Layer
 * Handles business logic and database operations for organizations and
 * their memberships. Each audiobook can be scoped to an organization
 * and users may belong to multiple organizations with distinct roles.
 */
import { PrismaClient, Prisma, OrganizationRole } from '@prisma/client';
import {
   OrganizationDto,
   OrganizationMemberDto,
   OrganizationWithMembershipDto,
   CreateOrganizationDto,
   UpdateOrganizationDto,
   AddOrganizationMemberDto,
   toOrganizationDto,
   toOrganizationMemberDto,
   toOrganizationWithMembershipDto,
} from '../models/OrganizationDto';
import { AudioBookDto, toAudioBookDto } from '../models/AudioBookDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

// Slug constraints: lowercase letters, digits and hyphens. We disallow
// leading/trailing hyphens and runs of hyphens to keep URLs predictable.
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 100;
const MAX_SLUG_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export class OrganizationService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Create a new organization. The supplied userProfileId becomes the
    * owner of the organization and is automatically added as a member
    * with the OWNER role. Both operations are wrapped in a transaction
    * so the organization is never left without its owner membership.
    */
   async createOrganization(
      userProfileId: string,
      dto: CreateOrganizationDto
   ): Promise<OrganizationDto> {
      const name = this.validateName(dto.name);
      const slug = this.validateSlug(dto.slug);
      const description = this.validateDescription(dto.description);

      try {
         await this.assertUserProfileExists(userProfileId);

         const created = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.organization.findUnique({ where: { slug } });
            if (existing) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('organizations.slug_exists'),
                  HttpStatusCode.CONFLICT,
                  ErrorType.CONFLICT
               );
            }

            const organization = await tx.organization.create({
               data: {
                  name,
                  slug,
                  description: description ?? null,
                  ownerId: userProfileId,
                  members: {
                     create: {
                        userProfileId,
                        role: OrganizationRole.OWNER,
                     },
                  },
               },
            });

            return organization;
         });

         return toOrganizationDto(created);
      } catch (error) {
         if (error instanceof ApiError) throw error;
         if (this.isUniqueConstraintError(error)) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.slug_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.create_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * List all organizations that the given user is a member of, including
    * the user's role inside each organization.
    */
   async getOrganizationsForUser(
      userProfileId: string
   ): Promise<OrganizationWithMembershipDto[]> {
      try {
         const memberships = await this.prisma.organizationMember.findMany({
            where: { userProfileId },
            include: { organization: true },
            orderBy: { organization: { name: 'asc' } },
         });

         return memberships.map((m) =>
            toOrganizationWithMembershipDto(m.organization, m.role)
         );
      } catch (_error) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get an organization by ID. The caller must be a member of the
    * organization or an ApiError(FORBIDDEN) will be thrown.
    */
   async getOrganizationById(
      organizationId: string,
      requestingUserProfileId: string
   ): Promise<OrganizationDto> {
      try {
         const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
         });

         if (!organization) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         await this.assertMembership(organizationId, requestingUserProfileId);

         return toOrganizationDto(organization);
      } catch (error) {
         if (error instanceof ApiError) throw error;
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Update an organization. Only OWNER or ADMIN members can update.
    */
   async updateOrganization(
      organizationId: string,
      requestingUserProfileId: string,
      dto: UpdateOrganizationDto
   ): Promise<OrganizationDto> {
      try {
         await this.assertOrganizationExists(organizationId);
         await this.assertRole(organizationId, requestingUserProfileId, [
            OrganizationRole.OWNER,
            OrganizationRole.ADMIN,
         ]);

         const data: Prisma.OrganizationUpdateInput = {};

         if (dto.name !== undefined) {
            data.name = this.validateName(dto.name);
         }
         if (dto.slug !== undefined) {
            data.slug = this.validateSlug(dto.slug);
         }
         if (dto.description !== undefined) {
            // Explicit null means "clear the description".
            data.description = dto.description === null
               ? null
               : this.validateDescription(dto.description) ?? null;
         }

         if (Object.keys(data).length === 0) {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.no_update_fields'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const updated = await this.prisma.organization.update({
            where: { id: organizationId },
            data,
         });

         return toOrganizationDto(updated);
      } catch (error) {
         if (error instanceof ApiError) throw error;
         if (this.isUniqueConstraintError(error)) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.slug_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.update_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Delete an organization. Only the OWNER can delete. Cascading deletes
    * remove memberships and detach audiobooks (configured at the schema
    * level: members are cascade-deleted; audiobooks are also cascade-deleted
    * because they cannot exist without their parent organization once one
    * has been assigned).
    */
   async deleteOrganization(
      organizationId: string,
      requestingUserProfileId: string
   ): Promise<void> {
      try {
         await this.assertOrganizationExists(organizationId);
         await this.assertRole(organizationId, requestingUserProfileId, [
            OrganizationRole.OWNER,
         ]);

         await this.prisma.organization.delete({ where: { id: organizationId } });
      } catch (error) {
         if (error instanceof ApiError) throw error;
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.delete_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * List all members of an organization. Caller must be a member.
    */
   async getMembers(
      organizationId: string,
      requestingUserProfileId: string
   ): Promise<OrganizationMemberDto[]> {
      try {
         await this.assertOrganizationExists(organizationId);
         await this.assertMembership(organizationId, requestingUserProfileId);

         const members = await this.prisma.organizationMember.findMany({
            where: { organizationId },
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
         });

         return members.map(toOrganizationMemberDto);
      } catch (error) {
         if (error instanceof ApiError) throw error;
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.member_fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Add a member to an organization. Only OWNER or ADMIN can add members.
    * MEMBER is the default role if not specified.
    */
   async addMember(
      organizationId: string,
      requestingUserProfileId: string,
      dto: AddOrganizationMemberDto
   ): Promise<OrganizationMemberDto> {
      const targetUserProfileId = (dto.userProfileId || '').trim();
      if (!targetUserProfileId) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.user_profile_required'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }

      const role = this.validateRole(dto.role ?? OrganizationRole.MEMBER);

      try {
         await this.assertOrganizationExists(organizationId);
         await this.assertRole(organizationId, requestingUserProfileId, [
            OrganizationRole.OWNER,
            OrganizationRole.ADMIN,
         ]);
         await this.assertUserProfileExists(targetUserProfileId);

         const existing = await this.prisma.organizationMember.findUnique({
            where: {
               organizationId_userProfileId: {
                  organizationId,
                  userProfileId: targetUserProfileId,
               },
            },
         });
         if (existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.member_already_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }

         const member = await this.prisma.organizationMember.create({
            data: {
               organizationId,
               userProfileId: targetUserProfileId,
               role,
            },
         });

         return toOrganizationMemberDto(member);
      } catch (error) {
         if (error instanceof ApiError) throw error;
         if (this.isUniqueConstraintError(error)) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.member_already_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.member_add_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Update a member's role. Only the OWNER may change roles. The owner
    * cannot demote themselves if they are the only OWNER. When promoting
    * a member to OWNER the previous owner is automatically demoted to
    * ADMIN (ownership transfer).
    */
   async updateMemberRole(
      organizationId: string,
      requestingUserProfileId: string,
      targetUserProfileId: string,
      newRole: OrganizationRole
   ): Promise<OrganizationMemberDto> {
      const validatedRole = this.validateRole(newRole);

      try {
         await this.assertOrganizationExists(organizationId);
         await this.assertRole(organizationId, requestingUserProfileId, [
            OrganizationRole.OWNER,
         ]);

         const target = await this.prisma.organizationMember.findUnique({
            where: {
               organizationId_userProfileId: {
                  organizationId,
                  userProfileId: targetUserProfileId,
               },
            },
         });
         if (!target) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.member_not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         if (target.role === validatedRole) {
            return toOrganizationMemberDto(target);
         }

         // Demoting the only OWNER is not allowed; an organization must
         // always have an owner. Ownership must be transferred first.
         if (
            target.role === OrganizationRole.OWNER &&
            validatedRole !== OrganizationRole.OWNER
         ) {
            const ownerCount = await this.prisma.organizationMember.count({
               where: { organizationId, role: OrganizationRole.OWNER },
            });
            if (ownerCount <= 1) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('organizations.cannot_demote_last_owner'),
                  HttpStatusCode.BAD_REQUEST,
                  ErrorType.VALIDATION_ERROR
               );
            }
         }

         // Promoting a member to OWNER triggers an ownership transfer:
         // the requesting OWNER is demoted to ADMIN and the new owner is
         // also recorded on the Organization's ownerId column.
         if (validatedRole === OrganizationRole.OWNER) {
            const updated = await this.prisma.$transaction(async (tx) => {
               await tx.organizationMember.update({
                  where: {
                     organizationId_userProfileId: {
                        organizationId,
                        userProfileId: requestingUserProfileId,
                     },
                  },
                  data: { role: OrganizationRole.ADMIN },
               });

               const newOwnerMember = await tx.organizationMember.update({
                  where: {
                     organizationId_userProfileId: {
                        organizationId,
                        userProfileId: targetUserProfileId,
                     },
                  },
                  data: { role: OrganizationRole.OWNER },
               });

               await tx.organization.update({
                  where: { id: organizationId },
                  data: { ownerId: targetUserProfileId },
               });

               return newOwnerMember;
            });

            return toOrganizationMemberDto(updated);
         }

         const updated = await this.prisma.organizationMember.update({
            where: {
               organizationId_userProfileId: {
                  organizationId,
                  userProfileId: targetUserProfileId,
               },
            },
            data: { role: validatedRole },
         });

         return toOrganizationMemberDto(updated);
      } catch (error) {
         if (error instanceof ApiError) throw error;
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.member_update_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Remove a member from the organization. OWNER/ADMIN may remove other
    * members, and any member can remove themselves (leave). The OWNER
    * cannot be removed without first transferring ownership.
    */
   async removeMember(
      organizationId: string,
      requestingUserProfileId: string,
      targetUserProfileId: string
   ): Promise<void> {
      try {
         await this.assertOrganizationExists(organizationId);

         const requestingMember = await this.assertMembership(
            organizationId,
            requestingUserProfileId
         );

         const isSelfRemoval = requestingUserProfileId === targetUserProfileId;
         const canRemoveOthers =
            requestingMember.role === OrganizationRole.OWNER ||
            requestingMember.role === OrganizationRole.ADMIN;

         if (!isSelfRemoval && !canRemoveOthers) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.forbidden'),
               HttpStatusCode.FORBIDDEN,
               ErrorType.FORBIDDEN
            );
         }

         const target = await this.prisma.organizationMember.findUnique({
            where: {
               organizationId_userProfileId: {
                  organizationId,
                  userProfileId: targetUserProfileId,
               },
            },
         });
         if (!target) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.member_not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         // An OWNER cannot be removed (whether by themselves or someone
         // else). Ownership must be transferred to another member first.
         if (target.role === OrganizationRole.OWNER) {
            throw new ApiError(
               MessageHandler.getErrorMessage('organizations.cannot_remove_owner'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         await this.prisma.organizationMember.delete({
            where: {
               organizationId_userProfileId: {
                  organizationId,
                  userProfileId: targetUserProfileId,
               },
            },
         });
      } catch (error) {
         if (error instanceof ApiError) throw error;
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.member_remove_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * List audiobooks owned by an organization. Caller must be a member.
    */
   async getOrganizationAudioBooks(
      organizationId: string,
      requestingUserProfileId: string
   ): Promise<AudioBookDto[]> {
      try {
         await this.assertOrganizationExists(organizationId);
         await this.assertMembership(organizationId, requestingUserProfileId);

         const audiobooks = await this.prisma.audioBook.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            include: {
               audiobookTags: { include: { tag: true } },
               audioBookGenres: { include: { genre: true } },
            },
         });

         return audiobooks.map(toAudioBookDto);
      } catch (error) {
         if (error instanceof ApiError) throw error;
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.audiobooks_fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   // ------------------------------------------------------------------
   // Internal validation / assertion helpers
   // ------------------------------------------------------------------

   private validateName(name: unknown): string {
      if (typeof name !== 'string') {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.name_required'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      const trimmed = name.trim();
      if (trimmed.length === 0) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.name_required'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      if (trimmed.length > MAX_NAME_LENGTH) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.name_too_long'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      return trimmed;
   }

   private validateSlug(slug: unknown): string {
      if (typeof slug !== 'string') {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.slug_required'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      const normalized = slug.trim().toLowerCase();
      if (normalized.length === 0) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.slug_required'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      if (normalized.length > MAX_SLUG_LENGTH) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.slug_too_long'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      if (!SLUG_REGEX.test(normalized)) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.slug_invalid'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      return normalized;
   }

   private validateDescription(description: unknown): string | undefined {
      if (description === undefined || description === null) {
         return undefined;
      }
      if (typeof description !== 'string') {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.description_too_long'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      const trimmed = description.trim();
      if (trimmed.length === 0) return undefined;
      if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.description_too_long'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      return trimmed;
   }

   private validateRole(role: unknown): OrganizationRole {
      const allowed: OrganizationRole[] = [
         OrganizationRole.OWNER,
         OrganizationRole.ADMIN,
         OrganizationRole.MEMBER,
      ];
      if (typeof role !== 'string' || !allowed.includes(role as OrganizationRole)) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.role_invalid'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
      return role as OrganizationRole;
   }

   private async assertOrganizationExists(organizationId: string): Promise<void> {
      const exists = await this.prisma.organization.findUnique({
         where: { id: organizationId },
         select: { id: true },
      });
      if (!exists) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }
   }

   private async assertUserProfileExists(userProfileId: string): Promise<void> {
      const exists = await this.prisma.userProfile.findUnique({
         where: { id: userProfileId },
         select: { id: true },
      });
      if (!exists) {
         throw new ApiError(
            MessageHandler.getErrorMessage('user.profile_not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }
   }

   /**
    * Returns the requesting user's membership record, or throws FORBIDDEN
    * if they are not a member of the organization.
    */
   private async assertMembership(
      organizationId: string,
      userProfileId: string
   ): Promise<{ id: string; role: OrganizationRole }> {
      const member = await this.prisma.organizationMember.findUnique({
         where: {
            organizationId_userProfileId: { organizationId, userProfileId },
         },
         select: { id: true, role: true },
      });
      if (!member) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.not_a_member'),
            HttpStatusCode.FORBIDDEN,
            ErrorType.FORBIDDEN
         );
      }
      return member;
   }

   /**
    * Asserts that the requesting user has one of the allowed roles in
    * the organization. Throws FORBIDDEN otherwise.
    */
   private async assertRole(
      organizationId: string,
      userProfileId: string,
      allowedRoles: OrganizationRole[]
   ): Promise<void> {
      const member = await this.assertMembership(organizationId, userProfileId);
      if (!allowedRoles.includes(member.role)) {
         throw new ApiError(
            MessageHandler.getErrorMessage('organizations.forbidden'),
            HttpStatusCode.FORBIDDEN,
            ErrorType.FORBIDDEN
         );
      }
   }

   private isUniqueConstraintError(error: unknown): boolean {
      return (
         typeof error === 'object' &&
         error !== null &&
         'code' in error &&
         (error as { code?: string }).code === 'P2002'
      );
   }
}
