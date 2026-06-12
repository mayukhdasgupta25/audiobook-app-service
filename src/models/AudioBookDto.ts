/**
 * AudioBook DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { AudioBook as PrismaAudioBook } from '@prisma/client';

/** Subscription playback access for a single audiobook (detail responses). */
export interface AudiobookSubscriptionAccessDto {
  canAccess: boolean;
  /** Human-readable reason when `canAccess` is false; omitted when access is granted. */
  message?: string;
  requiredTier?: number;
  userTier?: number | null;
}

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
  minSubscriptionTier?: number | null | undefined;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date | undefined;
  audiobookTags?: AudioBookTagDto[] | undefined;
  genres?: GenreDto[] | undefined;
  organizationId?: string | null | undefined;
  authorId?: string | null | undefined;
  organization?: AudioBookOrganizationDto | undefined;
  subscriptionAccess?: AudiobookSubscriptionAccessDto;
  /** Current user's star rating (1–5) for this audiobook; null if not reviewed. */
  rating?: number | null;
}

export interface AudioBookOrganizationDto {
  id: string;
  name: string;
  slug: string;
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
  organizationId?: string;
  authorId?: string;
  language?: string;
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  isActive?: boolean;
  isPublic?: boolean;
  minSubscriptionTier?: number | null;
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
  organizationId?: string | null;
  language?: string;
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  isActive?: boolean;
  isPublic?: boolean;
  minSubscriptionTier?: number | null;
  scheduledAt?: Date;
}

export interface AudioBookQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  genreIds?: string[] | undefined;
  moodIds?: string[] | undefined;
  organizationId?: string | undefined;
  /** Optional filter: restrict to these publisher org IDs (not access control). */
  organizationIds?: string[] | undefined;
  language?: string | undefined;
  author?: string | undefined;
  narrator?: string | undefined;
  isActive?: boolean | undefined;
  isPublic?: boolean | undefined;
  search?: string | undefined;
  active?: boolean | undefined;
  scheduled?: boolean | undefined;
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
    minSubscriptionTier: (audiobook as PrismaAudioBook & { minSubscriptionTier?: number | null }).minSubscriptionTier ?? null,
    createdAt: audiobook.createdAt,
    updatedAt: audiobook.updatedAt,
    scheduledAt: audiobook.scheduledAt || undefined,
    audiobookTags: audiobook.audiobookTags?.map(tag => ({
      name: tag.tag.name
    })) || undefined,
    genres: audiobook.audioBookGenres?.map(abg => ({
      name: abg.genre.name
    })) || undefined,
    organizationId: audiobook.organizationId ?? null,
    authorId: (audiobook as PrismaAudioBook & { authorId?: string | null }).authorId ?? null,
  };
}
