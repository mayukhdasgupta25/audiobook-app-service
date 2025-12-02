/**
 * Author DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { Author as PrismaAuthor } from '@prisma/client';

export interface AuthorDto {
   id: string;
   firstName: string;
   lastName: string;
   email?: string | null;
   address?: string | null;
   contact?: string | null;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateAuthorDto {
   firstName: string;
   lastName: string;
   email?: string;
   address?: string;
   contact?: string;
}

export interface UpdateAuthorDto {
   firstName?: string;
   lastName?: string;
   email?: string;
   address?: string;
   contact?: string;
}

/**
 * Convert Prisma Author model to AuthorDto
 * Ensures consistent data structure for API responses
 */
export function toAuthorDto(author: PrismaAuthor): AuthorDto {
   return {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      email: author.email ?? null,
      address: author.address ?? null,
      contact: author.contact ?? null,
      createdAt: author.createdAt,
      updatedAt: author.updatedAt
   };
}

