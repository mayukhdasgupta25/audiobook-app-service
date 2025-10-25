/**
 * AudioBook DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { AudioBook as PrismaAudioBook } from '@prisma/client';

export interface AudioBookDto {
  id: string;
  title: string;
  author: string;
  narrator?: string | undefined;
  description?: string | undefined;
  duration: number;
  fileSize: number;
  coverImage?: string | undefined;
  language: string;
  publisher?: string | undefined;
  publishDate?: Date | undefined;
  isbn?: string | undefined;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  audiobookTags?: AudioBookTagDto[] | undefined;
  genre?: GenreDto | undefined;
}

export interface AudioBookTagDto {
  name: string;
  type: string;
}

export interface GenreDto {
  name: string;
}

export interface CreateAudioBookDto {
  title: string;
  author: string;
  narrator?: string;
  description?: string;
  duration: number;
  fileSize: number;
  coverImage?: string;
  genreId?: string;
  language?: string;
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  isActive?: boolean;
  isPublic?: boolean;
}

export interface UpdateAudioBookDto {
  title?: string;
  author?: string;
  narrator?: string;
  description?: string;
  duration?: number;
  fileSize?: number;
  coverImage?: string;
  genreId?: string;
  language?: string;
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  isActive?: boolean;
  isPublic?: boolean;
}

export interface AudioBookQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  genreId?: string | undefined;
  language?: string | undefined;
  author?: string | undefined;
  narrator?: string | undefined;
  isActive?: boolean | undefined;
  isPublic?: boolean | undefined;
  search?: string | undefined;
}

/**
 * Convert Prisma AudioBook to DTO
 */
export function toAudioBookDto(audiobook: PrismaAudioBook & {
  audiobookTags?: Array<{ id: string; audiobookId: string; tagId: string; createdAt: Date; tag: { id: string; name: string; type: string; createdAt: Date; updatedAt: Date } }>;
  genre?: { id: string; name: string; createdAt: Date; updatedAt: Date } | null;
}): AudioBookDto {
  return {
    id: audiobook.id,
    title: audiobook.title,
    author: audiobook.author,
    narrator: audiobook.narrator || undefined,
    description: audiobook.description || undefined,
    duration: audiobook.duration,
    fileSize: Number(audiobook.fileSize),
    coverImage: audiobook.coverImage || undefined,
    language: audiobook.language,
    publisher: audiobook.publisher || undefined,
    publishDate: audiobook.publishDate || undefined,
    isbn: audiobook.isbn || undefined,
    isActive: audiobook.isActive,
    isPublic: audiobook.isPublic,
    createdAt: audiobook.createdAt,
    updatedAt: audiobook.updatedAt,
    audiobookTags: audiobook.audiobookTags?.map(tag => ({
      name: tag.tag.name,
      type: tag.tag.type
    })) || undefined,
    genre: audiobook.genre ? {
      name: audiobook.genre.name
    } : undefined
  };
}
