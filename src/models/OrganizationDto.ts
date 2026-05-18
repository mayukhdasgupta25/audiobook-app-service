/**
 * Organization DTOs (Data Transfer Objects)
 * Provides type-safe data structures for organization-related API communication
 */
import {
   Organization as PrismaOrganization,
   OrganizationMember as PrismaOrganizationMember,
   OrganizationRole as PrismaOrganizationRole,
} from '@prisma/client';

export type OrganizationRole = PrismaOrganizationRole;

export interface OrganizationDto {
   id: string;
   name: string;
   slug: string;
   description?: string | null;
   ownerId: string;
   createdAt: Date;
   updatedAt: Date;
}

export interface OrganizationWithMembershipDto extends OrganizationDto {
   // The role of the requesting user within this organization. Useful for
   // listing endpoints that return all organizations a user belongs to.
   memberRole: OrganizationRole;
}

export interface OrganizationMemberDto {
   id: string;
   organizationId: string;
   userProfileId: string;
   role: OrganizationRole;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateOrganizationDto {
   name: string;
   slug: string;
   description?: string;
}

export interface UpdateOrganizationDto {
   name?: string;
   slug?: string;
   description?: string | null;
}

export interface AddOrganizationMemberDto {
   userProfileId: string;
   role?: OrganizationRole;
}

export interface UpdateOrganizationMemberDto {
   role: OrganizationRole;
}

export function toOrganizationDto(org: PrismaOrganization): OrganizationDto {
   return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description ?? null,
      ownerId: org.ownerId,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
   };
}

export function toOrganizationWithMembershipDto(
   org: PrismaOrganization,
   memberRole: OrganizationRole
): OrganizationWithMembershipDto {
   return {
      ...toOrganizationDto(org),
      memberRole,
   };
}

export function toOrganizationMemberDto(
   member: PrismaOrganizationMember
): OrganizationMemberDto {
   return {
      id: member.id,
      organizationId: member.organizationId,
      userProfileId: member.userProfileId,
      role: member.role,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
   };
}
