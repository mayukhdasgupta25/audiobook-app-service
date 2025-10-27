/**
 * AudioBookDto Tests
 * Tests for AudioBook DTO conversion and validation
 */

import {
   CreateAudioBookDto,
   UpdateAudioBookDto,
   AudioBookQueryParams,
   toAudioBookDto,
} from '../../models/AudioBookDto';

describe('AudioBookDto', () => {
   // Mock factory for creating test data
   const createMockPrismaAudioBook = (overrides = {}) => {
      return {
         id: 'test-audiobook-id',
         title: 'Test Audiobook',
         author: 'Test Author',
         narrator: 'Test Narrator',
         description: 'Test Description',
         duration: 3600, // 1 hour in seconds
         fileSize: BigInt(1024 * 1024 * 500), // 500 MB
         coverImage: 'https://example.com/cover.jpg',
         genreId: null,
         language: 'en',
         publisher: 'Test Publisher',
         publishDate: new Date('2024-01-01'),
         isbn: '1234567890123',
         isActive: true,
         isPublic: true,
         isOfflineAvailable: false,
         overallProgress: 0.0,
         createdAt: new Date('2024-01-01'),
         updatedAt: new Date('2024-01-02'),
         audiobookTags: [],
         genre: null,
         ...overrides,
      };
   };

   describe('toAudioBookDto', () => {
      it('should convert Prisma AudioBook to DTO with all fields', () => {
         const prismaAudioBook = createMockPrismaAudioBook();

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.id).toBe(prismaAudioBook.id);
         expect(result.title).toBe(prismaAudioBook.title);
         expect(result.author).toBe(prismaAudioBook.author);
         expect(result.narrator).toBe(prismaAudioBook.narrator);
         expect(result.description).toBe(prismaAudioBook.description);
         expect(result.duration).toBe(prismaAudioBook.duration);
         expect(result.fileSize).toBe(Number(prismaAudioBook.fileSize));
         expect(result.coverImage).toBe(prismaAudioBook.coverImage);
         expect(result.language).toBe(prismaAudioBook.language);
         expect(result.publisher).toBe(prismaAudioBook.publisher);
         expect(result.publishDate).toEqual(prismaAudioBook.publishDate);
         expect(result.isbn).toBe(prismaAudioBook.isbn);
         expect(result.isActive).toBe(prismaAudioBook.isActive);
         expect(result.isPublic).toBe(prismaAudioBook.isPublic);
         expect(result.createdAt).toEqual(prismaAudioBook.createdAt);
         expect(result.updatedAt).toEqual(prismaAudioBook.updatedAt);
      });

      it('should handle null optional string fields by converting to undefined', () => {
         const prismaAudioBook = createMockPrismaAudioBook({
            narrator: null,
            description: null,
            coverImage: null,
            publisher: null,
            isbn: null,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.narrator).toBeUndefined();
         expect(result.description).toBeUndefined();
         expect(result.coverImage).toBeUndefined();
         expect(result.publisher).toBeUndefined();
         expect(result.isbn).toBeUndefined();
      });

      it('should handle null publishDate by converting to undefined', () => {
         const prismaAudioBook = createMockPrismaAudioBook({
            publishDate: null,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.publishDate).toBeUndefined();
      });

      it('should convert BigInt fileSize to Number', () => {
         const largeFileSize = BigInt('9223372036854775807'); // Max safe integer
         const prismaAudioBook = createMockPrismaAudioBook({
            fileSize: largeFileSize,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.fileSize).toBe(Number(largeFileSize));
         expect(typeof result.fileSize).toBe('number');
      });

      it('should handle genre when present', () => {
         const mockGenre = {
            id: 'genre-id',
            name: 'Fantasy',
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         const prismaAudioBook = createMockPrismaAudioBook({
            genre: mockGenre,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.genre).toBeDefined();
         expect(result.genre?.name).toBe('Fantasy');
      });

      it('should handle null genre by converting to undefined', () => {
         const prismaAudioBook = createMockPrismaAudioBook({
            genre: null,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.genre).toBeUndefined();
      });

      it('should handle audiobookTags with multiple tags', () => {
         const mockTags = [
            {
               id: 'tag1',
               audiobookId: 'audiobook-id',
               tagId: 't1',
               createdAt: new Date(),
               tag: {
                  id: 't1',
                  name: 'Trending',
                  type: 'TRENDING',
                  createdAt: new Date(),
                  updatedAt: new Date(),
               },
            },
            {
               id: 'tag2',
               audiobookId: 'audiobook-id',
               tagId: 't2',
               createdAt: new Date(),
               tag: {
                  id: 't2',
                  name: 'New Release',
                  type: 'NEW_RELEASES',
                  createdAt: new Date(),
                  updatedAt: new Date(),
               },
            },
         ];

         const prismaAudioBook = createMockPrismaAudioBook({
            audiobookTags: mockTags,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.audiobookTags).toBeDefined();
         expect(result.audiobookTags?.length).toBe(2);
         expect(result.audiobookTags?.[0]).toEqual({
            name: 'Trending',
            type: 'TRENDING',
         });
         expect(result.audiobookTags?.[1]).toEqual({
            name: 'New Release',
            type: 'NEW_RELEASES',
         });
      });

      it('should handle empty audiobookTags array', () => {
         const prismaAudioBook = createMockPrismaAudioBook({
            audiobookTags: [],
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.audiobookTags).toEqual([]);
      });

      it('should handle undefined audiobookTags', () => {
         const prismaAudioBook = createMockPrismaAudioBook({
            audiobookTags: undefined,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.audiobookTags).toBeUndefined();
      });
   });

   describe('CreateAudioBookDto', () => {
      it('should accept valid CreateAudioBookDto', () => {
         const createDto: CreateAudioBookDto = {
            title: 'New Audiobook',
            author: 'New Author',
            duration: 1800,
            fileSize: 1024 * 1024,
         };

         expect(createDto.title).toBe('New Audiobook');
         expect(createDto.author).toBe('New Author');
         expect(createDto.duration).toBe(1800);
         expect(createDto.fileSize).toBe(1024 * 1024);
      });

      it('should accept optional fields in CreateAudioBookDto', () => {
         const createDto: CreateAudioBookDto = {
            title: 'New Audiobook',
            author: 'New Author',
            duration: 1800,
            fileSize: 1024 * 1024,
            narrator: 'Narrator Name',
            description: 'Description',
            coverImage: 'image.jpg',
            genreId: 'genre-id',
            language: 'en',
            publisher: 'Publisher',
            publishDate: new Date(),
            isbn: '1234567890',
            isActive: true,
            isPublic: true,
         };

         expect(createDto.narrator).toBe('Narrator Name');
         expect(createDto.description).toBe('Description');
         expect(createDto.genreId).toBe('genre-id');
      });
   });

   describe('UpdateAudioBookDto', () => {
      it('should accept all optional fields', () => {
         const updateDto: UpdateAudioBookDto = {
            title: 'Updated Title',
            author: 'Updated Author',
            narrator: 'Updated Narrator',
            description: 'Updated Description',
            duration: 2400,
            fileSize: 2048 * 1024,
            coverImage: 'updated.jpg',
            genreId: 'new-genre-id',
            language: 'fr',
            publisher: 'New Publisher',
            publishDate: new Date(),
            isbn: '9876543210',
            isActive: false,
            isPublic: false,
         };

         expect(updateDto.title).toBe('Updated Title');
         expect(updateDto.language).toBe('fr');
         expect(updateDto.isActive).toBe(false);
      });

      it('should accept partial updates', () => {
         const partialUpdate: UpdateAudioBookDto = {
            title: 'Only Title Updated',
         };

         expect(partialUpdate.title).toBe('Only Title Updated');
      });
   });

   describe('AudioBookQueryParams', () => {
      it('should accept valid query parameters', () => {
         const params: AudioBookQueryParams = {
            page: 1,
            limit: 20,
            sortBy: 'title',
            sortOrder: 'asc',
            genreId: 'genre-id',
            language: 'en',
            author: 'Author Name',
            narrator: 'Narrator Name',
            isActive: true,
            isPublic: true,
            search: 'keyword',
         };

         expect(params.page).toBe(1);
         expect(params.limit).toBe(20);
         expect(params.sortOrder).toBe('asc');
         expect(params.search).toBe('keyword');
      });

      it('should accept partial query parameters', () => {
         const params: AudioBookQueryParams = {
            page: 1,
            limit: 10,
         };

         expect(params.page).toBe(1);
         expect(params.limit).toBe(10);
      });

      it('should handle partial parameters', () => {
         const params: AudioBookQueryParams = {
            page: 1,
            limit: 10,
         };

         expect(params.page).toBe(1);
         expect(params.limit).toBe(10);
      });
   });

   describe('Edge cases', () => {
      it('should handle fileSize conversion for very large numbers', () => {
         const veryLargeFileSize = BigInt('999999999999'); // 999 GB
         const prismaAudioBook = createMockPrismaAudioBook({
            fileSize: veryLargeFileSize,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.fileSize).toBe(999999999999);
      });

      it('should handle zero duration', () => {
         const prismaAudioBook = createMockPrismaAudioBook({
            duration: 0,
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.duration).toBe(0);
      });

      it('should handle minimum file size', () => {
         const prismaAudioBook = createMockPrismaAudioBook({
            fileSize: BigInt(1),
         });

         const result = toAudioBookDto(prismaAudioBook);

         expect(result.fileSize).toBe(1);
      });
   });
});

