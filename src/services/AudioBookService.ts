/**
 * AudioBook Service Layer
 * Handles business logic and database operations following OOP principles
 */
import { PrismaClient, Prisma, UserAudioBookType } from '@prisma/client';
import { SubscriptionClient, subscriptionClient } from '../clients/SubscriptionClient';
import {
  AudioBookDto,
  AudiobookSubscriptionAccessDto,
  CreateAudioBookDto,
  UpdateAudioBookDto,
  AudioBookQueryParams,
  toAudioBookDto,
  toPrismaOwnerType,
} from '../models/AudioBookDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { BackgroundJobService } from './BackgroundJobService';
import { fileUrlService } from './FileUrlService';
import { UserAudioBookService } from './UserAudioBookService';
import { ChapterService } from './ChapterService';
import { HttpStatusCode, ErrorType } from '../types/common';
import { AudiobookMediaCleanupService } from './AudiobookMediaCleanupService';
import { AudioBookOwnerService } from './AudioBookOwnerService';

export class AudioBookService {
  private prisma: PrismaClient;
  private backgroundJobService: BackgroundJobService | undefined;
  private subscriptionClient: SubscriptionClient;
  private audioBookOwnerService: AudioBookOwnerService;

  constructor(
    prisma: PrismaClient,
    backgroundJobService?: BackgroundJobService,
    subscriptionClientInstance: SubscriptionClient = subscriptionClient
  ) {
    this.prisma = prisma;
    this.backgroundJobService = backgroundJobService;
    this.subscriptionClient = subscriptionClientInstance;
    this.audioBookOwnerService = new AudioBookOwnerService(prisma);
  }

  private async hydrateOwner(
    dto: AudioBookDto,
    accessToken?: string,
  ): Promise<AudioBookDto> {
    return this.audioBookOwnerService.attachOwnerDetail(dto, accessToken);
  }

  private async hydrateOwners(
    dtos: AudioBookDto[],
    accessToken?: string,
  ): Promise<AudioBookDto[]> {
    return this.audioBookOwnerService.attachOwnerDetails(dtos, accessToken);
  }

  /**
   * Get all audiobooks with pagination and filtering
   */
  async getAllAudioBooks(params: AudioBookQueryParams, accessToken?: string): Promise<{
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
            audioBookGenres: {
              include: {
                genre: true,
              }
            }
          }
        }),
        this.prisma.audioBook.count({ where })
      ]);

      const resolved = await fileUrlService.resolveAudioBookMediaList(
        audiobooks.map(toAudioBookDto)
      );

      return {
        audiobooks: await this.hydrateOwners(resolved, accessToken),
        totalCount
      };
    } catch (error) {
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.fetch_audiobooks'));
    }
  }

  /**
   * Get all audiobooks with chapter counts
   */
  async getAllAudioBooksWithChapterCounts(params: AudioBookQueryParams, accessToken?: string): Promise<{
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
            audioBookGenres: {
              include: {
                genre: true,
              }
            }
          }
        }),
        this.prisma.audioBook.count({ where })
      ]);

      const resolved = await Promise.all(
        audiobooks.map(async audiobook => ({
          ...(await fileUrlService.resolveAudioBookMedia(toAudioBookDto(audiobook))),
          chapterCount: audiobook._count.chapters
        }))
      );

      const hydrated = await this.hydrateOwners(resolved, accessToken);

      return {
        audiobooks: hydrated.map((dto, index) => ({
          ...dto,
          chapterCount: resolved[index]?.chapterCount ?? 0,
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
   * `ownerIds` optionally restricts results to those owner IDs (same ownerType);
   * `ownerId` (singular) filters to a single owner and takes precedence when both
   * are provided with ownerType. Listing is not gated on caller membership.
   */
  private buildWhereClause(params: AudioBookQueryParams): Prisma.AudioBookWhereInput {
    const {
      genreIds,
      moodIds,
      ownerType,
      ownerId,
      ownerIds,
      language,
      author,
      narrator,
      isActive,
      isPublic,
      search,
      active,
      scheduled,
    } = params;

    const ownerFilter: Prisma.AudioBookWhereInput = ownerType && ownerId
      ? { ownerType: toPrismaOwnerType(ownerType), ownerId }
      : ownerType && ownerIds && ownerIds.length > 0
        ? { ownerType: toPrismaOwnerType(ownerType), ownerId: { in: ownerIds } }
        : ownerId
          ? { ownerId }
          : ownerIds && ownerIds.length > 0
            ? { ownerId: { in: ownerIds } }
            : {};

    const where: Prisma.AudioBookWhereInput = {
      ...ownerFilter,
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
  async getAudioBookById(id: string, accessToken?: string): Promise<AudioBookDto> {
    try {
      const audiobook = await this.prisma.audioBook.findUnique({
        where: { id },
        include: {
          audiobookTags: {
            include: {
              tag: true
            }
          },
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

      const dto = await fileUrlService.resolveAudioBookMedia(toAudioBookDto(audiobook));
      return this.hydrateOwner(dto, accessToken);
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
  async getAudioBookByIdWithChapters(id: string, accessToken?: string): Promise<AudioBookDto & { chapters: any[] }> {
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

      const dto = await this.hydrateOwner(
        await fileUrlService.resolveAudioBookMedia(toAudioBookDto(audiobook)),
        accessToken,
      );
      return {
        ...dto,
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
  async createAudioBook(
    data: CreateAudioBookDto & { tagIds?: string[]; genreIds?: string[] },
    ownerUserProfileId?: string,
    accessToken?: string,
  ): Promise<AudioBookDto> {
    try {
      // Extract tagIds and genreIds from data before validation
      const { tagIds, genreIds, ...audiobookData } = data;

      // Validate required fields
      this.validateCreateData(audiobookData, genreIds);

      // Construct data object, only including defined values for optional fields
      const createData: Prisma.AudioBookUncheckedCreateInput = {
        title: audiobookData.title,
        author: audiobookData.author,
        ownerType: toPrismaOwnerType(audiobookData.owner.type),
        ownerId: audiobookData.owner.id,
        language: audiobookData.language || 'bn',
        isPublic: this.parseBooleanFlag(audiobookData.isPublic, true),
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
        createData.minSubscriptionTier = this.validateMinSubscriptionTier(audiobookData.minSubscriptionTier);
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

      // Creator owns the audiobook when they have a user profile (skipped for admins without a profile)
      if (ownerUserProfileId) {
        const userAudioBookService = new UserAudioBookService(this.prisma);
        await userAudioBookService.createOwnedUserAudioBook(ownerUserProfileId, audiobook.id);
      }

      return this.hydrateOwner(
        await fileUrlService.resolveAudioBookMedia(toAudioBookDto(audiobookWithRelations)),
        accessToken,
      );
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
  async updateAudioBook(
    id: string,
    data: UpdateAudioBookDto,
    tagIds?: string[],
    genreIds?: string[],
    accessToken?: string,
  ): Promise<AudioBookDto> {
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
      const updateData: Prisma.AudioBookUncheckedUpdateInput = { ...data };
      if (data.scheduledAt !== undefined) {
        updateData.isActive = false;
      }
      if (data.minSubscriptionTier !== undefined) {
        updateData.minSubscriptionTier = this.validateMinSubscriptionTier(data.minSubscriptionTier);
      }
      if (data.owner !== undefined) {
        updateData.ownerType = toPrismaOwnerType(data.owner.type);
        updateData.ownerId = data.owner.id;
      }
      delete (updateData as { owner?: unknown }).owner;

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

      return this.hydrateOwner(
        await fileUrlService.resolveAudioBookMedia(toAudioBookDto(audiobookWithRelations)),
        accessToken,
      );
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
      const cleanupService = new AudiobookMediaCleanupService(this.prisma);
      await cleanupService.deleteAudiobookWithChapters(id);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.delete_audiobook'));
    }
  }

  /**
   * Recalculate and store user-audiobook progress (total seconds listened across chapters).
   */
  async updateAudiobookProgress(id: string, userProfileId: string): Promise<AudioBookDto> {
    try {
      // Verify audiobook exists
      const audiobook = await this.prisma.audioBook.findUnique({
        where: { id }
      });

      if (!audiobook) {
        throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
      }

      const chapterService = new ChapterService(this.prisma);
      const progressSeconds = await chapterService.calculateAudiobookProgress(userProfileId, id);

      const existingUserAudioBook = await this.prisma.userAudioBook.findUnique({
        where: {
          userProfileId_audiobookId: { userProfileId, audiobookId: id },
        },
        select: { progress: true },
      });
      const storedProgress = existingUserAudioBook
        ? Math.max(existingUserAudioBook.progress, progressSeconds)
        : progressSeconds;

      // Update user-audiobook progress (never decrease)
      await this.prisma.userAudioBook.upsert({
        where: {
          userProfileId_audiobookId: {
            userProfileId,
            audiobookId: id
          }
        },
        update: {
          progress: storedProgress
        },
        create: {
          userProfileId,
          audiobookId: id,
          type: UserAudioBookType.PURCHASED,
          progress: storedProgress
        }
      });

      return fileUrlService.resolveAudioBookMedia(toAudioBookDto(audiobook));
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

      return fileUrlService.resolveAudioBookMedia(toAudioBookDto(audiobook));
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
  async getAudioBooksByTags(tags: string[], params: AudioBookQueryParams, accessToken?: string): Promise<{
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
            audioBookGenres: {
              include: {
                genre: true,
              }
            }
          }
        }),
        this.prisma.audioBook.count({ where })
      ]);

      const resolved = await fileUrlService.resolveAudioBookMediaList(
        audiobooks.map(toAudioBookDto)
      );

      return {
        audiobooks: await this.hydrateOwners(resolved, accessToken),
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

    if (!data.owner?.type || !data.owner?.id?.trim()) {
      throw ApiError.validationError('owner is required with type and id');
    }

    if (data.owner.type !== 'AUTHOR' && data.owner.type !== 'ORGANIZATION') {
      throw ApiError.validationError('owner.type must be AUTHOR or ORGANIZATION');
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

  private parseBooleanFlag(value: boolean | string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value === 'true' || value === true;
  }

  /**
   * Validate a `minSubscriptionTier` value. Null is allowed (means "no
   * subscription gating"); any other value must be a non-negative integer.
   */
  private validateMinSubscriptionTier(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw ApiError.validationError(
        MessageHandler.getErrorMessage('validation.min_subscription_tier_invalid')
      );
    }
    return parsed;
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
