import { AuthorService } from '../../services/AuthorService';

const mockPrisma = {
   author: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
   },
} as any;

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
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
});
