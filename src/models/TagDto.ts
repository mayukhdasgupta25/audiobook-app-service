/**
 * Tag DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { Tag as PrismaTag } from '@prisma/client';

export interface TagDto {
   id: string;
   name: string;
   type: string;
   createdAt: Date;
   updatedAt: Date;
}

/**
 * Convert Prisma Tag model to TagDto
 * Ensures consistent data structure for API responses
 */
export function toTagDto(tag: PrismaTag): TagDto {
   return {
      id: tag.id,
      name: tag.name,
      type: tag.type,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
   };
}

