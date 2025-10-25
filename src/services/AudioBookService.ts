/**
 * AudioBook Service Layer
 * Handles business logic and database operations following OOP principles
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { AudioBookDto, CreateAudioBookDto, UpdateAudioBookDto, AudioBookQueryParams, toAudioBookDto } from '../models/AudioBookDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';

export class AudioBookService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
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
  async createAudioBook(data: CreateAudioBookDto): Promise<AudioBookDto> {
    try {
      // Validate required fields
      this.validateCreateData(data);

      const audiobook = await this.prisma.audioBook.create({
        data: {
          ...data,
          language: data.language || 'en',
          isActive: data.isActive ?? true,
          isPublic: data.isPublic ?? true
        }
      });

      return toAudioBookDto(audiobook);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw ApiError.conflict(MessageHandler.getErrorMessage('conflict.audiobook_exists'));
        }
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalError(MessageHandler.getErrorMessage('internal.create_audiobook'));
    }
  }

  /**
   * Update an existing audiobook
   */
  async updateAudioBook(id: string, data: UpdateAudioBookDto): Promise<AudioBookDto> {
    try {
      // Check if audiobook exists
      const existingAudioBook = await this.prisma.audioBook.findUnique({
        where: { id }
      });

      if (!existingAudioBook) {
        throw ApiError.notFound('AudioBook');
      }

      const audiobook = await this.prisma.audioBook.update({
        where: { id },
        data
      });

      return toAudioBookDto(audiobook);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw ApiError.conflict(MessageHandler.getErrorMessage('conflict.audiobook_exists'));
        }
      }
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
   * Update audiobook overall progress
   */
  async updateAudiobookProgress(id: string, progress: number): Promise<AudioBookDto> {
    try {
      // Validate progress value
      if (progress < 0 || progress > 100) {
        throw ApiError.validationError('Progress must be between 0 and 100');
      }

      const audiobook = await this.prisma.audioBook.update({
        where: { id },
        data: { overallProgress: progress }
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
        totalDuration: durationStats._sum.duration || 0,
        averageDuration: Math.round(durationStats._avg.duration || 0)
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

    if (!data.duration || data.duration <= 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.duration_positive'));
    }

    if (!data.fileSize || data.fileSize <= 0) {
      throw ApiError.validationError(MessageHandler.getErrorMessage('validation.file_size_positive'));
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
