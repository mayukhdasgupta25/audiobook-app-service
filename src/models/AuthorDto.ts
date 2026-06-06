/**
 * Author DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { Author as PrismaAuthor, Prisma } from '@prisma/client';

export interface OrganizationSummary {
   id: string;
   name: string;
   slug: string;
}

export interface AuthorDto {
   id: string;
   firstName: string;
   lastName: string;
   email?: string | null;
   address?: string | null;
   contact?: string | null;
   organizations?: OrganizationSummary[];
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateAuthorDto {
   firstName: string;
   lastName: string;
   email?: string;
   address?: string;
   contact?: string;
   organizationIds?: string[];
}

export interface UpdateAuthorDto {
   firstName?: string;
   lastName?: string;
   email?: string;
   address?: string;
   contact?: string;
   organizationIds?: string[];
}

type AuthorWithOrganizations = Prisma.AuthorGetPayload<{
   include: {
      organizations: {
         include: {
            organization: true;
         };
      };
   };
}>;

const authorInclude = {
   organizations: {
      include: {
         organization: {
            select: {
               id: true,
               name: true,
               slug: true,
            },
         },
      },
   },
} as const;

export { authorInclude };

/**
 * Convert Prisma Author model to AuthorDto
 */
export function toAuthorDto(author: PrismaAuthor | AuthorWithOrganizations): AuthorDto {
   const dto: AuthorDto = {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      email: author.email ?? null,
      address: author.address ?? null,
      contact: author.contact ?? null,
      createdAt: author.createdAt,
      updatedAt: author.updatedAt,
   };

   if ('organizations' in author) {
      dto.organizations = author.organizations.map((link) => ({
         id: link.organization.id,
         name: link.organization.name,
         slug: link.organization.slug,
      }));
   }

   return dto;
}
