/**
 * AudioBook Service Layer
 * Handles business logic and database operations following OOP principles
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { SubscriptionClient, subscriptionClient } from '../clients/SubscriptionClient';
import {
  AudioBookDto,
  AudiobookSubscriptionAccessDto,
  CreateAudioBookDto,
  UpdateAudioBookDto,
  AudioBookQueryParams,
  toAudioBookDto
} from '../models/AudioBookDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { BackgroundJobService } from './BackgroundJobService';
import { HttpStatusCode, ErrorType } from '../types/common';

export class AudioBookService {
  private prisma: PrismaClient;
  private backgroundJobService: BackgroundJobService | undefined;
  private subscriptionClient: SubscriptionClient;

  constructor(
    prisma: PrismaClient,
    backgroundJobService?: BackgroundJobService,
    subscriptionClientInstance: SubscriptionClient = subscriptionClient
  ) {
    this.prisma = prisma;
    this.backgroundJobService = backgroundJobService;
    this.subscriptionClient = subscriptionClientInstance;
  }

  /**
   * Get all audiobooks with pagination and filtering
   */
  async getAllAudioBooks(params: AudioBookQueryParams): Promise<{
    audiobooks: AudioBookDto[];
    totalCount: number;
  }> {
    try {
      const where = this.buildWhereClause(params);

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      // Build orderBy clause
      const orderBy: Prisma.AudioBookOrderByWithRelationInput = {
        [sortBy]: sortOrder
      };

      const skip = (page - 1) * limit;

      const [audiobooks, totalCount] = await Promise.all([
        this.prisma.audioBook.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            audiobookTags: {
              include: {
                tag: true
              }
            },
            organization: true,
            audioBookGenres: {
              include: {
                genre: true,
              }
            }
          }
        }),
        this.prisma.audioBook.count({ where })
      ]);

      return {
        audiobooks: audiobooks.map(toAudioBookDto),
        totalCount
      };
    } catch (_error) {
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.fetch_audiobooks'));
    }
  }

  /**
   * Get all audiobooks with chapter counts
   */
  async getAllAudioBooksWithChapterCounts(params: AudioBookQueryParams): Promise<{
    audiobooks: (AudioBookDto & { chapterCount: number })[];
    totalCount: number;
  }> {
    try {
      const where = this.buildWhereClause(params);

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      // Build orderBy clause
      const orderBy: Prisma.AudioBookOrderByWithRelationInput = {
        [sortBy]: sortOrder
      };

      const skip = (page - 1) * limit;

      const [audiobooks, totalCount] = await Promise.all([
        this.prisma.audioBook.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                chapters: true
              }
            },
            audiobookTags: {
              include: {
                tag: true
              }
            },
            organization: true,
            audioBookGenres: {
              include: {
                genre: true,
              }
            }
          }
        }),
        this.prisma.audioBook.count({ where })
      ]);

      return {
        audiobooks: audiobooks.map(audiobook => ({
          ...toAudioBookDto(audiobook),
          chapterCount: audiobook._count.chapters
        })),
        totalCount
      };
    } catch (_error) {
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.fetch_audiobooks'));
    }
  }

  /**
   * Build the Prisma where clause for audiobook list queries. Centralised
   * so list/list-with-counts/tags/etc. all stay in sync.
   *
   * `organizationIds` (plural) optionally restricts results to those orgs
   * (e.g. internal tooling); `organizationId` (singular) filters to a single
   * org and takes precedence when both are provided. Listing is not gated on
   * the caller being a member of those organizations.
   */
  private buildWhereClause(params: AudioBookQueryParams): Prisma.AudioBookWhereInput {
    const {
      genreIds,
      moodIds,
      organizationId,
      organizationIds,
      language,
      author,
      narrator,
      isActive,
      isPublic,
      search,
      active,
      scheduled,
    } = params;

    const where: Prisma.AudioBookWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(isPublic !== undefined && { isPublic }),
      ...(genreIds && genreIds.length > 0 && {
        audioBookGenres: {
          some: { genreId: { in: genreIds } },
        },
      }),
      ...(moodIds && moodIds.length > 0 && {
        moodId: { in: moodIds },
      }),
      ...(organizationId
        ? { organizationId }
        : organizationIds && organizationIds.length > 0
          ? { organizationId: { in: organizationIds } }
          : {}),
      ...(language && { language: { contains: language, mode: 'insensitive' } }),
      ...(author && { author: { contains: author, mode: 'insensitive' } }),
      ...(narrator && { narrator: { contains: narrator, mode: 'insensitive' } }),
      ...(active === true && { isActive: true }),
      ...(scheduled === true && { isActive: false }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { narrator: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    return where;
  }

  /**
   * Get audiobook by ID
   */
  async getAudioBookById(id: string): Promise<AudioBookDto> {
    try {
      const audiobook = await this.prisma.audioBook.findUnique({
        where: { id },
        include: {
          audiobookTags: {
            include: {
              tag: true
            }
          },
          organization: true,
          audioBookGenres: {
            include: {
              genre: true,
            }
          }
        }
      });

      if (!audiobook) {
        throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
      }

      return toAudioBookDto(audiobook);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.fetch_audiobook'));
    }
  }

  /**
   * Get audiobook by ID with chapters
   */
  async getAudioBookByIdWithChapters(id: string): Promise<AudioBookDto & { chapters: any[] }> {
    try {
      const audiobook = await this.prisma.audioBook.findUnique({
        where: { id },
        include: {
          chapters: {
            orderBy: { chapterNumber: 'asc' }
          },
          audiobookTags: {
            include: {
              tag: true
            }
          },
          organization: true,
          audioBookGenres: {
            include: {
              genre: true,
            }
          }
        }
      });

      if (!audiobook) {
        throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
      }

      return {
        ...toAudioBookDto(audiobook),
        chapters: audiobook.chapters
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.fetch_audiobook'));
    }
  }

  /**
   * Create a new audiobook
   */
  async createAudioBook(data: CreateAudioBookDto & { tagIds?: string[]; genreIds?: string[] }): Promise<AudioBookDto> {
    try {
      // Extract tagIds and genreIds from data before validation
      const { tagIds, genreIds, ...audiobookData } = data;

      // Validate required fields
      this.validateCreateData(audiobookData, genreIds);

      // Construct data object, only including defined values for optional fields
      const createData: any = {
        title: audiobookData.title,
        author: audiobookData.author,
        organizationId: audiobookData.organizationId, // Required
        language: audiobookData.language || 'bn', // Default language is now Bengali
        isPublic: audiobookData.isPublic ?? true,
      };

      // Handle scheduledAt: if provided, set isActive=false and schedule activation job
      if (audiobookData.scheduledAt !== undefined) {
        createData.scheduledAt = audiobookData.scheduledAt;
        createData.isActive = false;
      } else {
        createData.isActive = audiobookData.isActive ?? true;
      }

      // Add optional fields only if they are defined
      if (audiobookData.narrator !== undefined) createData.narrator = audiobookData.narrator;
      if (audiobookData.description !== undefined) createData.description = audiobookData.description;
      if (audiobookData.duration !== undefined) createData.duration = audiobookData.duration;
      if (audiobookData.fileSize !== undefined) createData.fileSize = BigInt(audiobookData.fileSize);
      if (audiobookData.coverImage !== undefined) createData.coverImage = audiobookData.coverImage;
      if (audiobookData.publisher !== undefined) createData.publisher = audiobookData.publisher;
      if (audiobookData.publishDate !== undefined) createData.publishDate = audiobookData.publishDate;
      if (audiobookData.isbn !== undefined) createData.isbn = audiobookData.isbn;
      if (audiobookData.minSubscriptionTier !== undefined) {
        this.validateMinSubscriptionTier(audiobookData.minSubscriptionTier);
        createData.minSubscriptionTier = audiobookData.minSubscriptionTier;
      }

      const audiobook = await this.prisma.audioBook.create({
        data: createData
      });

      // Create AudioBookGenre records if genreIds are provided
      // Ensure genreIds is an array before using map
      if (genreIds && Array.isArray(genreIds) && genreIds.length > 0) {
        await Promise.all(
          genreIds.map(genreId =>
            this.prisma.audioBookGenre.create({
              data: {
                audiobookId: audiobook.id,
                genreId: genreId
              }
            })
          )
        );
      }

      // Create AudioBookTag records if tagIds are provided
      // Ensure tagIds is an array before using map
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        await Promise.all(
          tagIds.map(tagId =>
            this.prisma.audioBookTag.create({
              data: {
                audiobookId: audiobook.id,
                tagId: tagId
              }
            })
          )
        );
      }

      // Fetch the audiobook with all relations included
      const audiobookWithRelations = await this.prisma.audioBook.findUnique({
        where: { id: audiobook.id },
        include: {
          audiobookTags: {
            include: {
              tag: true
            }
          },
          organization: true,
          audioBookGenres: {
            include: {
              genre: true,
            }
          }
        }
      });

      if (!audiobookWithRelations) {
        throw ApiError.internalError(MessageHandler.getErrorMessage('internal.create_audiobook'));
      }

      // Schedule activation job if scheduledAt was provided
      if (audiobookData.scheduledAt !== undefined && this.backgroundJobService) {
        try {
          await this.backgroundJobService.scheduleActivationJob('audiobook', audiobook.id, audiobookData.scheduledAt);
        } catch (_error) {
          // Log error but don't fail audiobook creation
          console.error(`Error scheduling activation job for audiobook ${audiobook.id}:`, _error);
        }
      }

      return toAudioBookDto(audiobookWithRelations);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw ApiError.conflict(MessageHandler.getErrorMessage('conflict.audiobook_exists'));
        }
      }
      if (error instanceof ApiError) {
        throw error;
      }
      console.log('error', error);
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.create_audiobook'));
    }
  }

  /**
   * Update an existing audiobook
   */
  async updateAudioBook(id: string, data: UpdateAudioBookDto, tagIds?: string[], genreIds?: string[]): Promise<AudioBookDto> {
    try {
      // Check if audiobook exists
      const existingAudioBook = await this.prisma.audioBook.findUnique({
        where: { id }
      });

      if (!existingAudioBook) {
        throw ApiError.notFound('AudioBook');
      }

      // Validate: Cannot schedule an active audiobook
      if (data.scheduledAt !== undefined && existingAudioBook.isActive) {
        throw ApiError.validationError('Active audiobook cannot be scheduled');
      }

      // Handle scheduledAt: if provided, set isActive=false and schedule activation job
      const updateData: any = { ...data };
      if (data.scheduledAt !== undefined) {
        updateData.isActive = false;
      }
      if (data.minSubscriptionTier !== undefined) {
        this.validateMinSubscriptionTier(data.minSubscriptionTier);
        updateData.minSubscriptionTier = data.minSubscriptionTier;
      }

      // updateData.duration = parseInt(updateData.duration);
      // updateData.fileSize = BigInt(updateData.fileSize);

      await this.prisma.audioBook.update({
        where: { id },
        data: updateData
      });

      // Update AudioBookGenre records if genreIds are provided
      if (genreIds !== undefined) {
        // Delete existing genres
        await this.prisma.audioBookGenre.deleteMany({
          where: { audiobookId: id }
        });

        // Create new genres if genreIds array is not empty
        if (genreIds.length > 0) {
          await Promise.all(
            genreIds.map(genreId =>
              this.prisma.audioBookGenre.create({
                data: {
                  audiobookId: id,
                  genreId: genreId
                }
              })
            )
          );
        }
      }

      // Update AudioBookTag records if tagIds are provided
      if (tagIds !== undefined) {
        // Delete existing tags
        await this.prisma.audioBookTag.deleteMany({
          where: { audiobookId: id }
        });

        // Create new tags if tagIds array is not empty
        if (tagIds.length > 0) {
          await Promise.all(
            tagIds.map(tagId =>
              this.prisma.audioBookTag.create({
                data: {
                  audiobookId: id,
                  tagId: tagId
                }
              })
            )
          );
        }
      }

      // Schedule activation job if scheduledAt was provided
      if (data.scheduledAt !== undefined && this.backgroundJobService) {
        try {
          await this.backgroundJobService.scheduleActivationJob('audiobook', id, data.scheduledAt);
        } catch (_error) {
          // Log error but don't fail audiobook update
          console.error(`Error scheduling activation job for audiobook ${id}:`, _error);
        }
      }

      // Fetch the audiobook with all relations included
      const audiobookWithRelations = await this.prisma.audioBook.findUnique({
        where: { id },
        include: {
          audiobookTags: {
            include: {
              tag: true
            }
          },
          organization: true,
          audioBookGenres: {
            include: {
              genre: true,
            }
          }
        }
      });

      if (!audiobookWithRelations) {
        throw ApiError.internalError(MessageHandler.getErrorMessage('internal.update_audiobook'));
      }

      return toAudioBookDto(audiobookWithRelations);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw ApiError.conflict(MessageHandler.getErrorMessage('conflict.audiobook_exists'));
        }
      }
      console.log('error', error);
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.update_audiobook'));
    }
  }

  /**
   * Delete an audiobook
   */
  async deleteAudioBook(id: string): Promise<void> {
    try {
      const audiobook = await this.prisma.audioBook.findUnique({
        where: { id }
      });

      if (!audiobook) {
        throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
      }

      await this.prisma.audioBook.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.delete_audiobook'));
    }
  }

  /**
   * Update user-audiobook progress
   */
  async updateAudiobookProgress(id: string, userProfileId: string, progress: number): Promise<AudioBookDto> {
    try {
      // Validate progress value
      if (progress < 0 || progress > 100) {
        throw ApiError.validationError('Progress must be between 0 and 100');
      }

      // Verify audiobook exists
      const audiobook = await this.prisma.audioBook.findUnique({
        where: { id }
      });

      if (!audiobook) {
        throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
      }

      // Update user-audiobook progress
      await this.prisma.userAudioBook.upsert({
        where: {
          userProfileId_audiobookId: {
            userProfileId,
            audiobookId: id
          }
        },
        update: {
          progress: progress
        },
        create: {
          userProfileId,
          audiobookId: id,
          type: 'OWNED', // Default type, can be updated later if needed
          progress: progress
        }
      });

      return toAudioBookDto(audiobook);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
        }
      }
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.update_audiobook'));
    }
  }

  /**
   * Update audiobook offline availability
   */
  async updateOfflineAvailability(id: string, isAvailable: boolean): Promise<AudioBookDto> {
    try {
      const audiobook = await this.prisma.audioBook.update({
        where: { id },
        data: { isOfflineAvailable: isAvailable }
      });

      return toAudioBookDto(audiobook);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
        }
      }
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.update_audiobook'));
    }
  }

  /**
   * Get audiobooks by tags
   */
  async getAudioBooksByTags(tags: string[], params: AudioBookQueryParams): Promise<{
    audiobooks: AudioBookDto[];
    totalCount: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const where: Prisma.AudioBookWhereInput = {
        ...this.buildWhereClause(params),
        audiobookTags: {
          some: {
            tag: {
              name: { in: tags }
            }
          }
        }
      };

      // Build orderBy clause
      const orderBy: Prisma.AudioBookOrderByWithRelationInput = {
        [sortBy]: sortOrder
      };

      const skip = (page - 1) * limit;

      const [audiobooks, totalCount] = await Promise.all([
        this.prisma.audioBook.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            audiobookTags: {
              include: {
                tag: true
              }
            },
            organization: true,
            audioBookGenres: {
              include: {
                genre: true,
              }
            }
          }
        }),
        this.prisma.audioBook.count({ where })
      ]);

      return {
        audiobooks: audiobooks.map(toAudioBookDto),
        totalCount
      };
    } catch (_error) {
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.fetch_audiobooks'));
    }
  }

  /**
   * Get audiobook statistics
   */
  async getAudioBookStats(): Promise<{
    totalAudioBooks: number;
    activeAudioBooks: number;
    publicAudioBooks: number;
    totalDuration: number;
    averageDuration: number;
  }> {
    try {
      const [
        totalAudioBooks,
        activeAudioBooks,
        publicAudioBooks,
        durationStats
      ] = await Promise.all([
        this.prisma.audioBook.count(),
        this.prisma.audioBook.count({ where: { isActive: true } }),
        this.prisma.audioBook.count({ where: { isPublic: true } }),
        this.prisma.audioBook.aggregate({
          _sum: { duration: true },
          _avg: { duration: true }
        })
      ]);

      return {
        totalAudioBooks,
        activeAudioBooks,
        publicAudioBooks,
        totalDuration: durationStats._sum.duration ?? 0,
        averageDuration: Math.round(durationStats._avg.duration ?? 0)
      };
    } catch (_error) {
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.fetch_stats'));
    }
  }

  /**
   * Validate create audiobook data
   */
  private validateCreateData(data: Omit<CreateAudioBookDto, 'genreIds'>, genreIds?: string[]): void {
    if (!data.title || data.title.trim().length === 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.title_required'));
    }

    if (!data.author || data.author.trim().length === 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.author_required'));
    }

    // At least one genre is mandatory
    if (!genreIds || !Array.isArray(genreIds) || genreIds.length === 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.genre_required') || 'At least one genre is required');
    }

    // Validate that all genreIds are non-empty strings
    const invalidGenreIds = genreIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0);
    if (invalidGenreIds.length > 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.genre_required') || 'All genre IDs must be valid');
    }

    // Organization is mandatory - every audiobook belongs to an organization
    if (!data.organizationId || data.organizationId.trim().length === 0) {
      throw ApiError.validationError(
        MessageHandler.getErrorMessage('validation.organization_id_required') || 'Organization is required'
      );
    }

    // Organization is mandatory - every audiobook belongs to an organization
    if (!data.organizationId || data.organizationId.trim().length === 0) {
      throw ApiError.validationError(
        MessageHandler.getErrorMessage('validation.organization_id_required') || 'Organization is required'
      );
    }

    // Validate ISBN format if provided
    if (data.isbn && !this.isValidISBN(data.isbn)) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.isbn_format'));
    }
  }

  /**
   * Validate ISBN format
   */
  private isValidISBN(isbn: string): boolean {
    // Remove hyphens and spaces
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    // Check if it's 10 or 13 digits
    if (cleanISBN.length === 10) {
      return /^\d{9}[\dX]$/.test(cleanISBN);
    } else if (cleanISBN.length === 13) {
      return /^\d{13}$/.test(cleanISBN);
    }

    return false;
  }

  /**
   * Validate a `minSubscriptionTier` value. Null is allowed (means "no
   * subscription gating"); any other value must be a non-negative integer.
   */
  private validateMinSubscriptionTier(value: number | null | undefined): void {
    if (value === null || value === undefined) return;
    if (!Number.isInteger(value) || value < 0) {
      throw ApiError.validationError(
        MessageHandler.getErrorMessage('validation.min_subscription_tier_invalid')
      );
    }
  }

  /**
   * Find the highest active subscription tier for a user.
   * Only ACTIVE and TRIALING subscriptions count toward access. PAST_DUE is
   * intentionally excluded for content gating: the user has not paid for the
   * current period, so access to gated content is revoked until renewal.
   *
   * Returns the highest `tierLevel` among the user's qualifying subscriptions,
   * or `null` if the user has no qualifying subscription.
   */
  async getUserHighestActiveTier(userId: string, accessToken: string): Promise<number | null> {
    return this.subscriptionClient.getUserHighestActiveTier(userId, accessToken);
  }

  /**
   * Evaluate subscription-tier access for an audiobook without failing the request.
   * Returns `canAccess: true` when no tier is required or the user qualifies;
   * otherwise returns the same user-facing messages previously sent as 403 errors.
   */
  async getSubscriptionAccessForAudiobook(
    _audiobookId: string,
    minSubscriptionTier: number | null | undefined,
    userId: string | null,
    accessToken: string | null
  ): Promise<AudiobookSubscriptionAccessDto> {
    const requiredTier = minSubscriptionTier ?? null;
    if (requiredTier === null) {
      return { canAccess: true };
    }

    if (!userId || !accessToken) {
      return {
        canAccess: false,
        message: MessageHandler.getErrorMessage('forbidden.subscription_required'),
        requiredTier,
        userTier: null
      };
    }

    const userTier = await this.getUserHighestActiveTier(userId, accessToken);
    if (userTier === null) {
      return {
        canAccess: false,
        message: MessageHandler.getErrorMessage('forbidden.subscription_required'),
        requiredTier,
        userTier: null
      };
    }

    if (userTier < requiredTier) {
      return {
        canAccess: false,
        message: MessageHandler.getErrorMessage('forbidden.subscription_tier_too_low'),
        requiredTier,
        userTier
      };
    }

    return { canAccess: true, requiredTier, userTier };
  }

  /**
   * Returns the authenticated user's review rating for an audiobook, or null if none.
   */
  async getUserReviewRatingForAudiobook(
    audiobookId: string,
    externalUserId: string | null
  ): Promise<number | null> {
    if (!externalUserId) {
      return null;
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: externalUserId },
      select: { id: true },
    });
    if (!profile) {
      return null;
    }

    const review = await this.prisma.review.findUnique({
      where: {
        userProfileId_audiobookId: {
          userProfileId: profile.id,
          audiobookId,
        },
      },
      select: { rating: true },
    });

    return review?.rating ?? null;
  }

  /**
   * @deprecated Use {@link getSubscriptionAccessForAudiobook} for API responses.
   * Throws only when the audiobook does not exist (for scripts/tests that enforce access).
   */
  async assertUserCanAccessBySubscription(
    audiobookId: string,
    userId: string | null,
    accessToken: string | null
  ): Promise<void> {
    const audiobook = await this.prisma.audioBook.findUnique({
      where: { id: audiobookId },
      select: { id: true, minSubscriptionTier: true }
    });
    if (!audiobook) {
      throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
    }

    const access = await this.getSubscriptionAccessForAudiobook(
      audiobookId,
      (audiobook as { minSubscriptionTier?: number | null }).minSubscriptionTier,
      userId,
      accessToken
    );
    if (!access.canAccess) {
      throw new ApiError(
        access.message ?? MessageHandler.getErrorMessage('forbidden.subscription_required'),
        HttpStatusCode.FORBIDDEN,
        ErrorType.FORBIDDEN
      );
    }
  }
}
