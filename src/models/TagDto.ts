/**
 * Tag DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { Tag as PrismaTag } from '@prisma/client';

export interface TagDto {
   id: string;
   name: string;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateTagDto {
   name: string;
}

export interface UpdateTagDto {
   name?: string;
}

/**
 * Convert Prisma Tag model to TagDto
 * Ensures consistent data structure for API responses
 */
export function toTagDto(tag: PrismaTag): TagDto {
   return {
      id: tag.id,
      name: tag.name,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
   };
}

