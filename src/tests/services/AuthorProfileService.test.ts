import { PrismaClient } from '@prisma/client';
import { AuthorProfileService } from '../../services/AuthorProfileService';

jest.mock('../../services/FileUrlService', () => ({
   fileUrlService: {
      resolveAuthorProfileMedia: jest.fn(async (dto: unknown) => dto),
   },
}));

describe('AuthorProfileService', () => {
   let service: AuthorProfileService;
   let mockPrisma: {
      authorProfile: {
         findUnique: jest.Mock;
         create: jest.Mock;
      };
   };

   beforeEach(() => {
      mockPrisma = {
         authorProfile: {
            findUnique: jest.fn(),
            create: jest.fn(),
         },
      };
      service = new AuthorProfileService(mockPrisma as unknown as PrismaClient);
   });

   it('creates author profile from event payload', async () => {
      mockPrisma.authorProfile.findUnique.mockResolvedValue(null);
      mockPrisma.authorProfile.create.mockResolvedValue({
         id: 'profile-1',
         authorId: 'author-1',
         avatar: '/uploads/avatar.jpg',
         createdAt: new Date(),
         updatedAt: new Date(),
      });

      const result = await service.createFromEvent({
         authorId: 'author-1',
         avatar: '/uploads/avatar.jpg',
      });

      expect(result?.authorId).toBe('author-1');
      expect(mockPrisma.authorProfile.create).toHaveBeenCalled();
   });
});
