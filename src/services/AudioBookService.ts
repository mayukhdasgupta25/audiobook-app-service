/**
 * AudioBook Service Layer
 * Handles business logic and database operations following OOP principles
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { AudioBookDto, CreateAudioBookDto, UpdateAudioBookDto, AudioBookQueryParams, toAudioBookDto } from '../models/AudioBookDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { BackgroundJobService } from './BackgroundJobService';

export class AudioBookService {
  private prisma: PrismaClient;
  private backgroundJobService: BackgroundJobService | undefined;

  constructor(prisma: PrismaClient, backgroundJobService?: BackgroundJobService) {
    this.prisma = prisma;
    this.backgroundJobService = backgroundJobService;
  }

  /**
   * Get all audiobooks with pagination and filtering
   */
  async getAllAudioBooks(params: AudioBookQueryParams): Promise<{
    audiobooks: AudioBookDto[];
    totalCount: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        genreId,
        language,
        author,
        narrator,
        isActive,
        isPublic,
        search,
        active,
        scheduled
      } = params;

      // Build where clause for filtering
      const where: Prisma.AudioBookWhereInput = {
        ...(isActive !== undefined && { isActive }),
        ...(isPublic !== undefined && { isPublic }),
        ...(genreId && { genreId }),
        ...(language && { language: { contains: language, mode: 'insensitive' } }),
        ...(author && { author: { contains: author, mode: 'insensitive' } }),
        ...(narrator && { narrator: { contains: narrator, mode: 'insensitive' } }),
        // Handle active and scheduled query params (mutually exclusive)
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

      // Build orderBy clause
      const orderBy: Prisma.AudioBookOrderByWithRelationInput = {
        [sortBy]: sortOrder
      };

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Execute queries in parallel for better performance
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
            genre: true
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
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        genreId,
        language,
        author,
        narrator,
        isActive,
        isPublic,
        search,
        active,
        scheduled
      } = params;

      // Build where clause for filtering
      const where: Prisma.AudioBookWhereInput = {
        ...(isActive !== undefined && { isActive }),
        ...(isPublic !== undefined && { isPublic }),
        ...(genreId && { genreId }),
        ...(language && { language: { contains: language, mode: 'insensitive' } }),
        ...(author && { author: { contains: author, mode: 'insensitive' } }),
        ...(narrator && { narrator: { contains: narrator, mode: 'insensitive' } }),
        // Handle active and scheduled query params (mutually exclusive)
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

      // Build orderBy clause
      const orderBy: Prisma.AudioBookOrderByWithRelationInput = {
        [sortBy]: sortOrder
      };

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Execute queries in parallel for better performance
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
            genre: true
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
          genre: true
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
          genre: true
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
  async createAudioBook(data: CreateAudioBookDto & { tagIds?: string[] }): Promise<AudioBookDto> {
    try {
      // Extract tagIds from data before validation
      const { tagIds, ...audiobookData } = data;

      // Validate required fields
      this.validateCreateData(audiobookData);

      // Construct data object, only including defined values for optional fields
      const createData: any = {
        title: audiobookData.title,
        author: audiobookData.author,
        genreId: audiobookData.genreId, // Required
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

      const audiobook = await this.prisma.audioBook.create({
        data: createData
      });

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
          genre: true
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
  async updateAudioBook(id: string, data: UpdateAudioBookDto, tagIds?: string[]): Promise<AudioBookDto> {
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

      // updateData.duration = parseInt(updateData.duration);
      // updateData.fileSize = BigInt(updateData.fileSize);

      await this.prisma.audioBook.update({
        where: { id },
        data: updateData
      });

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
          genre: true
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
        genreId,
        language,
        author,
        narrator,
        isActive,
        isPublic,
        search
      } = params;

      // Build where clause for filtering
      const where: Prisma.AudioBookWhereInput = {
        ...(isActive !== undefined && { isActive }),
        ...(isPublic !== undefined && { isPublic }),
        ...(genreId && { genreId }),
        ...(language && { language: { contains: language, mode: 'insensitive' } }),
        ...(author && { author: { contains: author, mode: 'insensitive' } }),
        ...(narrator && { narrator: { contains: narrator, mode: 'insensitive' } }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
            { narrator: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        // Filter by tags - audiobooks that have ANY of the specified tags
        audiobookTags: {
          some: {
            tag: {
              name: {
                in: tags
              }
            }
          }
        }
      };

      // Build orderBy clause
      const orderBy: Prisma.AudioBookOrderByWithRelationInput = {
        [sortBy]: sortOrder
      };

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Execute queries in parallel for better performance
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
            genre: true
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
  private validateCreateData(data: CreateAudioBookDto): void {
    if (!data.title || data.title.trim().length === 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.title_required'));
    }

    if (!data.author || data.author.trim().length === 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.author_required'));
    }

    // Genre is now mandatory
    if (!data.genreId || data.genreId.trim().length === 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.genre_required') || 'Genre is required');
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
}
