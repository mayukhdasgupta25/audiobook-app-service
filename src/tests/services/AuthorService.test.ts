import { AuthorService } from '../../services/AuthorService';

const mockPrisma = {
   author: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
   },
   authorOrganization: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
   },
   organization: {
      findMany: jest.fn(),
   },
} as any;

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
   },
}));

jest.mock('../../services/FileUrlService', () => ({
   fileUrlService: {
      resolveAuthorMedia: jest.fn(async (dto: unknown) => dto),
      resolveAuthorMediaList: jest.fn(async (dtos: unknown[]) => dtos),
   },
}));

describe('AuthorService', () => {
   let authorService: AuthorService;

   beforeEach(() => {
      authorService = new AuthorService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('createAuthorFromEvent', () => {
      test('should create author from RabbitMQ event payload', async () => {
         mockPrisma.author.findUnique.mockResolvedValue(null);
         mockPrisma.author.create.mockResolvedValue({
            id: 'author-1',
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: '123 Main St',
            contact: '+1-555-0100',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await authorService.createAuthorFromEvent({
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: '123 Main St',
            contact: '+1-555-0100',
         });

         expect(result?.userId).toBe('user-123');
         expect(mockPrisma.author.create).toHaveBeenCalledWith({
            data: {
               userId: 'user-123',
               firstName: 'Jane',
               lastName: 'Doe',
               address: '123 Main St',
               contact: '+1-555-0100',
               profileImage: null,
            },
         });
      });

      test('should persist profileImage from RabbitMQ event payload', async () => {
         mockPrisma.author.findUnique.mockResolvedValue(null);
         mockPrisma.author.create.mockResolvedValue({
            id: 'author-1',
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: '123 Main St',
            contact: null,
            profileImage: 'uploads/images/authors/image-1.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         await authorService.createAuthorFromEvent({
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: '123 Main St',
            profileImage: 'uploads/images/authors/image-1.jpg',
         });

         expect(mockPrisma.author.create).toHaveBeenCalledWith({
            data: {
               userId: 'user-123',
               firstName: 'Jane',
               lastName: 'Doe',
               address: '123 Main St',
               contact: null,
               profileImage: 'uploads/images/authors/image-1.jpg',
            },
         });
      });

      test('should return existing author without creating duplicate', async () => {
         const existingAuthor = {
            id: 'author-1',
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: '123 Main St',
            contact: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         mockPrisma.author.findUnique.mockResolvedValue(existingAuthor);

         const result = await authorService.createAuthorFromEvent({
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: '123 Main St',
         });

         expect(result?.userId).toBe('user-123');
         expect(mockPrisma.author.create).not.toHaveBeenCalled();
      });

      test('should reject invalid message payload', async () => {
         await expect(
            authorService.createAuthorFromEvent({
               userId: '',
               firstName: 'Jane',
               lastName: 'Doe',
               address: '123 Main St',
            }),
         ).rejects.toThrow('Invalid message: userId is required and must be a string');
      });
   });

   describe('createAuthor', () => {
      test('should persist profileImage when provided', async () => {
         mockPrisma.author.findUnique.mockResolvedValue(null);
         mockPrisma.author.create.mockResolvedValue({
            id: 'author-1',
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: null,
            contact: null,
            profileImage: 'uploads/images/authors/image-1.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
         });
         mockPrisma.author.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
               id: 'author-1',
               userId: 'user-123',
               firstName: 'Jane',
               lastName: 'Doe',
               address: null,
               contact: null,
               profileImage: 'uploads/images/authors/image-1.jpg',
               createdAt: new Date(),
               updatedAt: new Date(),
               organizations: [],
            });

         const result = await authorService.createAuthor({
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            profileImage: 'uploads/images/authors/image-1.jpg',
         });

         expect(mockPrisma.author.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
               profileImage: 'uploads/images/authors/image-1.jpg',
            }),
         });
         expect(result.profileImage).toBe('uploads/images/authors/image-1.jpg');
      });
   });

   describe('updateAuthor', () => {
      test('should update profileImage when provided', async () => {
         const existingAuthor = {
            id: 'author-1',
            userId: 'user-123',
            firstName: 'Jane',
            lastName: 'Doe',
            address: null,
            contact: null,
            profileImage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         mockPrisma.author.findUnique
            .mockResolvedValueOnce(existingAuthor)
            .mockResolvedValueOnce({
               ...existingAuthor,
               profileImage: 'uploads/images/authors/image-2.jpg',
               organizations: [],
            });

         const result = await authorService.updateAuthor('author-1', {
            profileImage: 'uploads/images/authors/image-2.jpg',
         });

         expect(mockPrisma.author.update).toHaveBeenCalledWith({
            where: { id: 'author-1' },
            data: { profileImage: 'uploads/images/authors/image-2.jpg' },
         });
         expect(result.profileImage).toBe('uploads/images/authors/image-2.jpg');
      });
   });
});
