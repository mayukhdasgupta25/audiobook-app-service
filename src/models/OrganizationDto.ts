/**
 * Organization DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication for organizations
 * and organization-member relationships.
 */
import {
   Organization as PrismaOrganization,
   OrganizationMember as PrismaOrganizationMember,
   OrganizationRole,
} from '@prisma/client';

export type OrganizationRoleType = OrganizationRole;

export interface OrganizationDto {
   id: string;
   name: string;
   slug: string;
   description?: string | undefined;
   createdAt: Date;
   updatedAt: Date;
   memberCount?: number | undefined;
}

export interface OrganizationMemberDto {
   id: string;
   userProfileId: string;
   organizationId: string;
   role: OrganizationRoleType;
   joinedAt: Date;
   createdAt: Date;
   updatedAt: Date;
   organization?: OrganizationDto | undefined;
}

export interface CreateOrganizationDto {
   name: string;
   slug?: string;
   description?: string;
}

export interface UpdateOrganizationDto {
   name?: string;
   slug?: string;
   description?: string;
}

export interface AddOrganizationMemberDto {
   userProfileId: string;
   role?: OrganizationRoleType;
}

export interface UpdateOrganizationMemberDto {
   role: OrganizationRoleType;
}

/**
 * Convert a Prisma Organization record into a transport-safe DTO.
 * Optionally includes member count when supplied via the _count include.
 */
export function toOrganizationDto(
   organization: PrismaOrganization & { _count?: { members: number } }
): OrganizationDto {
   return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description || undefined,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      memberCount: organization._count?.members,
   };
}

/**
 * Convert a Prisma OrganizationMember record into a DTO.
 * If the related organization is provided, it is nested in the response.
 */
export function toOrganizationMemberDto(
   member: PrismaOrganizationMember & { organization?: PrismaOrganization }
): OrganizationMemberDto {
   return {
      id: member.id,
      userProfileId: member.userProfileId,
      organizationId: member.organizationId,
      role: member.role,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      organization: member.organization
         ? toOrganizationDto(member.organization)
         : undefined,
   };
}
