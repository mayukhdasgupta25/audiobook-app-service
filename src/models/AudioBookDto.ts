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
  duration?: number | undefined;
  fileSize?: number | undefined;
  coverImage?: string | undefined;
  language: string;
  publisher?: string | undefined;
  publishDate?: Date | undefined;
  isbn?: string | undefined;
  isActive: boolean;
  isPublic: boolean;
  organizationId?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date | undefined;
  audiobookTags?: AudioBookTagDto[] | undefined;
  genres?: GenreDto[] | undefined;
}

export interface AudioBookTagDto {
  name: string;
}

export interface GenreDto {
  name: string;
}

export interface CreateAudioBookDto {
  title: string;
  author: string;
  narrator?: string;
  description?: string;
  duration?: number;
  fileSize?: number;
  coverImage?: string;
  genreIds: string[]; // Required - at least one genre is mandatory
  language?: string;
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  isActive?: boolean;
  isPublic?: boolean;
  organizationId?: string; // Optional owning organization
  scheduledAt?: Date;
}

export interface UpdateAudioBookDto {
  title?: string;
  author?: string;
  narrator?: string;
  description?: string;
  duration?: number;
  fileSize?: number;
  coverImage?: string;
  genreIds?: string[];
  language?: string;
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  isActive?: boolean;
  isPublic?: boolean;
  organizationId?: string | null;
  scheduledAt?: Date;
}

export interface AudioBookQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  genreIds?: string[] | undefined;
  language?: string | undefined;
  author?: string | undefined;
  narrator?: string | undefined;
  isActive?: boolean | undefined;
  isPublic?: boolean | undefined;
  search?: string | undefined;
  active?: boolean | undefined;
  scheduled?: boolean | undefined;
  organizationId?: string | undefined;
}

/**
 * Convert Prisma AudioBook to DTO
 */
export function toAudioBookDto(audiobook: PrismaAudioBook & {
  audiobookTags?: Array<{ id: string; audiobookId: string; tagId: string; createdAt: Date; tag: { id: string; name: string; createdAt: Date; updatedAt: Date } }>;
  audioBookGenres?: Array<{ id: string; audiobookId: string; genreId: string; createdAt: Date; genre: { id: string; name: string; createdAt: Date; updatedAt: Date } }>;
}): AudioBookDto {
  return {
    id: audiobook.id,
    title: audiobook.title,
    author: audiobook.author,
    narrator: audiobook.narrator || undefined,
    description: audiobook.description || undefined,
    duration: audiobook.duration ?? undefined,
    fileSize: audiobook.fileSize ? Number(audiobook.fileSize) : undefined,
    coverImage: audiobook.coverImage || undefined,
    language: audiobook.language,
    publisher: audiobook.publisher || undefined,
    publishDate: audiobook.publishDate || undefined,
    isbn: audiobook.isbn || undefined,
    isActive: audiobook.isActive,
    isPublic: audiobook.isPublic,
    organizationId: audiobook.organizationId || undefined,
    createdAt: audiobook.createdAt,
    updatedAt: audiobook.updatedAt,
    scheduledAt: audiobook.scheduledAt || undefined,
    audiobookTags: audiobook.audiobookTags?.map(tag => ({
      name: tag.tag.name
    })) || undefined,
    genres: audiobook.audioBookGenres?.map(abg => ({
      name: abg.genre.name
    })) || undefined
  };
}
