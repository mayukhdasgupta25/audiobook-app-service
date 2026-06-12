/**
 * OrganizationService Tests
 *
 * Verifies CRUD, slug normalization, member management and access checks.
 * The Prisma client is fully mocked so these tests run without a database.
 */
import { OrganizationService } from '../../services/OrganizationService';
import { ApiError } from '../../types/ApiError';
import { OrganizationRole, OrganizationTeamSize } from '@prisma/client';

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
   },
}));

jest.mock('../../services/FileUrlService', () => ({
   fileUrlService: {
      resolveOrganizationMedia: jest.fn(async (dto: unknown) => dto),
      resolveOrganizationMediaList: jest.fn(async (dtos: unknown[]) => dtos),
   },
}));

// Build a Prisma double whose transaction callback just receives the same
// stub so we can exercise the same code paths in tests.
const buildMockPrisma = () => {
   const prisma: any = {
      organization: {
         findUnique: jest.fn(),
         findMany: jest.fn(),
         count: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
      },
      organizationMember: {
         findUnique: jest.fn(),
         findMany: jest.fn(),
         count: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
      },
      userProfile: {
         findUnique: jest.fn(),
      },
      genre: {
         findUnique: jest.fn(),
         findFirst: jest.fn(),
      },
      author: {
         findUnique: jest.fn(),
      },
      authorOrganization: {
         findUnique: jest.fn(),
      },
      audioBook: {
         findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
   };
   return prisma;
};

describe('OrganizationService', () => {
   let service: OrganizationService;
   let mockPrisma: any;

   beforeEach(() => {
      mockPrisma = buildMockPrisma();
      service = new OrganizationService(mockPrisma);
   });

   describe('createOrganization', () => {
      it('creates an organization and assigns the creator as OWNER', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         const created = {
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         };
         mockPrisma.organization.create.mockResolvedValue(created);
         mockPrisma.organizationMember.create.mockResolvedValue({});

         const result = await service.createOrganization(
            { name: 'Acme' },
            'user-1'
         );

         expect(result.id).toBe('org-1');
         expect(result.slug).toBe('acme');
         expect(mockPrisma.organization.create).toHaveBeenCalledWith({
            data: {
               name: 'Acme',
               slug: 'acme',
               description: null,
               image: null,
               preferredGenre: null,
               websiteUrl: null,
               teamSize: null,
            },
         });
         expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith({
            data: {
               organizationId: 'org-1',
               userProfileId: 'user-1',
               role: OrganizationRole.OWNER,
            },
         });
      });

      it('rejects empty names', async () => {
         await expect(
            service.createOrganization({ name: '   ' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects names longer than 100 characters', async () => {
         await expect(
            service.createOrganization({ name: 'a'.repeat(101) })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('throws conflict on duplicate slug', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({
            id: 'existing',
            slug: 'acme',
         });
         await expect(
            service.createOrganization({ name: 'Acme', slug: 'acme' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('normalizes slug from name when not provided', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.organization.create.mockResolvedValue({
            id: 'o',
            name: 'My Cool Org!',
            slug: 'my-cool-org',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         });
         await service.createOrganization({ name: 'My Cool Org!' });
         expect(mockPrisma.organization.create).toHaveBeenCalledWith(
            expect.objectContaining({
               data: expect.objectContaining({ slug: 'my-cool-org' }),
            })
         );
      });

      it('does not add a creator membership when none is provided', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.organization.create.mockResolvedValue({
            id: 'o',
            name: 'NoOwner',
            slug: 'noowner',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         });
         await service.createOrganization({ name: 'NoOwner' });
         expect(mockPrisma.organizationMember.create).not.toHaveBeenCalled();
      });

      it('persists image when provided', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.organization.create.mockResolvedValue({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            image: 'uploads/images/organizations/image-1.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.createOrganization({
            name: 'Acme',
            image: 'uploads/images/organizations/image-1.jpg',
         });

         expect(mockPrisma.organization.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
               image: 'uploads/images/organizations/image-1.jpg',
            }),
         });
         expect(result.image).toBe('uploads/images/organizations/image-1.jpg');
      });

      it('persists preferred genre, website URL, and team size when provided', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.genre.findFirst.mockResolvedValue({ name: 'Fiction' });
         mockPrisma.organization.create.mockResolvedValue({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            image: null,
            preferredGenre: 'Fiction',
            websiteUrl: 'https://acme.example.com',
            teamSize: OrganizationTeamSize.SIZE_11_50,
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.createOrganization({
            name: 'Acme',
            preferredGenre: 'Fiction',
            websiteUrl: 'https://acme.example.com',
            teamSize: '11-50',
         });

         expect(mockPrisma.genre.findFirst).toHaveBeenCalledWith({
            where: { name: { equals: 'Fiction', mode: 'insensitive' } },
            select: { name: true },
         });
         expect(mockPrisma.organization.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
               preferredGenre: 'Fiction',
               websiteUrl: 'https://acme.example.com',
               teamSize: OrganizationTeamSize.SIZE_11_50,
            }),
         });
         expect(result.teamSize).toBe('11-50');
         expect(result.preferredGenre).toBe('Fiction');
      });

      it('rejects unknown preferred genre on create', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.genre.findFirst.mockResolvedValue(null);

         await expect(
            service.createOrganization({
               name: 'Acme',
               preferredGenre: 'Unknown Genre',
            })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects invalid website URL on create', async () => {
         await expect(
            service.createOrganization({
               name: 'Acme',
               websiteUrl: 'not-a-url',
            })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects invalid team size on create', async () => {
         await expect(
            service.createOrganization({
               name: 'Acme',
               teamSize: 'invalid' as '1-10',
            })
         ).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('listOrganizations', () => {
      it('returns paginated organizations with default values', async () => {
         mockPrisma.organization.findMany.mockResolvedValue([]);
         mockPrisma.organization.count.mockResolvedValue(0);

         const result = await service.listOrganizations();
         expect(result).toEqual({ organizations: [], totalCount: 0 });
         expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 0, take: 10 })
         );
      });

      it('clamps page and limit to safe values', async () => {
         mockPrisma.organization.findMany.mockResolvedValue([]);
         mockPrisma.organization.count.mockResolvedValue(0);

         await service.listOrganizations({ page: -5, limit: 500 });
         expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 0, take: 100 })
         );
      });
   });

   describe('updateOrganization', () => {
      it('updates name and trims whitespace', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.organization.update.mockResolvedValue({
            id: 'o',
            name: 'NewName',
            slug: 's',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         await service.updateOrganization('o', { name: '  NewName  ' });
         expect(mockPrisma.organization.update).toHaveBeenCalledWith({
            where: { id: 'o' },
            data: expect.objectContaining({ name: 'NewName' }),
         });
      });

      it('updates image when provided', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.organization.update.mockResolvedValue({
            id: 'o',
            name: 'Acme',
            slug: 'acme',
            description: null,
            image: 'uploads/images/organizations/image-2.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.updateOrganization('o', {
            image: 'uploads/images/organizations/image-2.jpg',
         });

         expect(mockPrisma.organization.update).toHaveBeenCalledWith({
            where: { id: 'o' },
            data: { image: 'uploads/images/organizations/image-2.jpg' },
         });
         expect(result.image).toBe('uploads/images/organizations/image-2.jpg');
      });

      it('resolves preferred genre by name on update', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.genre.findFirst.mockResolvedValue({ name: 'Fiction' });
         mockPrisma.organization.update.mockResolvedValue({
            id: 'o',
            name: 'Acme',
            slug: 'acme',
            description: null,
            image: null,
            preferredGenre: 'Fiction',
            websiteUrl: null,
            teamSize: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         await service.updateOrganization('o', { preferredGenre: 'Fiction' });

         expect(mockPrisma.organization.update).toHaveBeenCalledWith({
            where: { id: 'o' },
            data: { preferredGenre: 'Fiction' },
         });
      });

      it('updates profile fields and allows clearing them', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.organization.update.mockResolvedValue({
            id: 'o',
            name: 'Acme',
            slug: 'acme',
            description: null,
            image: null,
            preferredGenre: null,
            websiteUrl: null,
            teamSize: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         await service.updateOrganization('o', {
            preferredGenre: null,
            websiteUrl: null,
            teamSize: null,
         });

         expect(mockPrisma.organization.update).toHaveBeenCalledWith({
            where: { id: 'o' },
            data: {
               preferredGenre: null,
               websiteUrl: null,
               teamSize: null,
            },
         });
      });

      it('rejects invalid team size on update', async () => {
         await expect(
            service.updateOrganization('o', { teamSize: 'huge' as '1-10' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('throws when no fields are provided', async () => {
         await expect(service.updateOrganization('o', {})).rejects.toBeInstanceOf(
            ApiError
         );
      });

      it('throws not found when the organization does not exist', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         await expect(
            service.updateOrganization('missing', { name: 'X' })
         ).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('deleteOrganization', () => {
      it('throws not found when the organization is missing', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         await expect(
            service.deleteOrganization('missing')
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('deletes when present', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.organization.delete.mockResolvedValue({});
         await service.deleteOrganization('o');
         expect(mockPrisma.organization.delete).toHaveBeenCalledWith({
            where: { id: 'o' },
         });
      });
   });

   describe('hasMembers', () => {
      it('returns false when the organization has no members', async () => {
         mockPrisma.organizationMember.count.mockResolvedValue(0);
         await expect(service.hasMembers('o')).resolves.toBe(false);
      });

      it('returns true when the organization has members', async () => {
         mockPrisma.organizationMember.count.mockResolvedValue(2);
         await expect(service.hasMembers('o')).resolves.toBe(true);
      });
   });

   describe('addMember', () => {
      it('adds a member as ADMIN by default', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'u' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
         mockPrisma.organizationMember.create.mockResolvedValue({
            id: 'm',
            organizationId: 'o',
            userProfileId: 'u',
            role: OrganizationRole.ADMIN,
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.addMember('o', 'u');
         expect(result.role).toBe(OrganizationRole.ADMIN);
      });

      it('throws conflict when membership already exists', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'u' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({ id: 'm' });
         await expect(service.addMember('o', 'u')).rejects.toBeInstanceOf(
            ApiError
         );
      });

      it('throws not found when org or user is missing', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'u' });
         await expect(service.addMember('o', 'u')).rejects.toBeInstanceOf(
            ApiError
         );
      });
   });

   describe('updateMemberRole', () => {
      it('prevents demoting the last owner', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm',
            organizationId: 'o',
            userProfileId: 'u',
            role: OrganizationRole.OWNER,
         });
         mockPrisma.organizationMember.count.mockResolvedValue(1);

         await expect(
            service.updateMemberRole('o', 'u', OrganizationRole.ADMIN)
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('allows demoting an owner when others remain', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm',
            organizationId: 'o',
            userProfileId: 'u',
            role: OrganizationRole.OWNER,
         });
         mockPrisma.organizationMember.count.mockResolvedValue(2);
         mockPrisma.organizationMember.update.mockResolvedValue({
            id: 'm',
            organizationId: 'o',
            userProfileId: 'u',
            role: OrganizationRole.ADMIN,
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.updateMemberRole(
            'o',
            'u',
            OrganizationRole.ADMIN
         );
         expect(result.role).toBe(OrganizationRole.ADMIN);
      });
   });

   describe('removeMember', () => {
      it('prevents removing the last owner', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm',
            organizationId: 'o',
            userProfileId: 'u',
            role: OrganizationRole.OWNER,
         });
         mockPrisma.organizationMember.count.mockResolvedValue(1);

         await expect(service.removeMember('o', 'u')).rejects.toBeInstanceOf(
            ApiError
         );
      });

      it('removes a non-owner member', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm',
            organizationId: 'o',
            userProfileId: 'u',
            role: OrganizationRole.ADMIN,
         });
         mockPrisma.organizationMember.delete.mockResolvedValue({});
         await service.removeMember('o', 'u');
         expect(mockPrisma.organizationMember.delete).toHaveBeenCalled();
      });
   });

   describe('access checks', () => {
      it('isMember returns true when membership exists', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            role: OrganizationRole.ADMIN,
         });
         expect(await service.isMember('o', 'u')).toBe(true);
      });

      it('isMember returns false when membership is missing', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
         expect(await service.isMember('o', 'u')).toBe(false);
      });

      it('hasOrgStaffAccess matches JWT role with membership tier', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            role: OrganizationRole.OWNER,
         });
         expect(await service.hasOrgStaffAccess('o', 'u', 'ORG_ADMIN')).toBe(true);
         expect(await service.hasOrgStaffAccess('o', 'u', 'LISTENER')).toBe(false);

         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            role: OrganizationRole.ADMIN,
         });
         expect(await service.hasOrgStaffAccess('o', 'u', 'ORG_COORDINATOR')).toBe(true);
         expect(await service.hasOrgStaffAccess('o', 'u', 'ORG_ADMIN')).toBe(false);

         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            role: OrganizationRole.ADMIN,
         });
         expect(await service.hasOrgStaffAccess('o', 'u', 'GLOBAL_ADMIN')).toBe(true);
      });

      it('getOrganizationIdsForUser returns all org ids the user belongs to', async () => {
         mockPrisma.organizationMember.findMany.mockResolvedValue([
            { organizationId: 'o1' },
            { organizationId: 'o2' },
         ]);
         expect(await service.getOrganizationIdsForUser('u')).toEqual([
            'o1',
            'o2',
         ]);
      });

      it('isAuthorLinkedToOrganization returns true when author is linked to org', async () => {
         mockPrisma.author.findUnique.mockResolvedValue({ id: 'author-1' });
         mockPrisma.authorOrganization.findUnique.mockResolvedValue({ id: 'link-1' });

         expect(await service.isAuthorLinkedToOrganization('auth-user-1', 'org-1')).toBe(true);
      });

      it('isAuthorLinkedToOrganization returns false when author profile is missing', async () => {
         mockPrisma.author.findUnique.mockResolvedValue(null);

         expect(await service.isAuthorLinkedToOrganization('auth-user-1', 'org-1')).toBe(false);
         expect(mockPrisma.authorOrganization.findUnique).not.toHaveBeenCalled();
      });

      it('canCreateAudiobook allows global admin without org membership', async () => {
         expect(
            await service.canCreateAudiobook('auth-user-1', undefined, 'org-1', 'GLOBAL_ADMIN'),
         ).toBe(true);
      });

      it('canCreateAudiobook allows author linked to target organization', async () => {
         mockPrisma.author.findUnique.mockResolvedValue({ id: 'author-1' });
         mockPrisma.authorOrganization.findUnique.mockResolvedValue({ id: 'link-1' });

         expect(
            await service.canCreateAudiobook('auth-user-1', 'profile-1', 'org-1', 'AUTHOR'),
         ).toBe(true);
      });

      it('canCreateAudiobook denies author not linked to target organization', async () => {
         mockPrisma.author.findUnique.mockResolvedValue({ id: 'author-1' });
         mockPrisma.authorOrganization.findUnique.mockResolvedValue(null);

         expect(
            await service.canCreateAudiobook('auth-user-1', 'profile-1', 'org-1', 'AUTHOR'),
         ).toBe(false);
      });

      it('canCreateAudiobook allows any authenticated user when organizationId is omitted', async () => {
         expect(
            await service.canCreateAudiobook('auth-user-1', 'profile-1', undefined, 'LISTENER'),
         ).toBe(true);
      });

      it('canCreateAudiobook denies unauthenticated user when organizationId is omitted', async () => {
         expect(
            await service.canCreateAudiobook(undefined, undefined, undefined, undefined),
         ).toBe(false);
      });

      it('canCreateChapter allows global admin when audiobook exists', async () => {
         mockPrisma.audioBook.findUnique.mockResolvedValue({ organizationId: 'org-1' });

         expect(
            await service.canCreateChapter('auth-user-1', undefined, 'audiobook-1', 'GLOBAL_ADMIN'),
         ).toEqual({ audiobookExists: true, allowed: true, organizationId: 'org-1' });
      });

      it('canCreateChapter allows author linked to audiobook organization', async () => {
         mockPrisma.audioBook.findUnique.mockResolvedValue({ organizationId: 'org-1' });
         mockPrisma.author.findUnique.mockResolvedValue({ id: 'author-1' });
         mockPrisma.authorOrganization.findUnique.mockResolvedValue({ id: 'link-1' });

         expect(
            await service.canCreateChapter('auth-user-1', 'profile-1', 'audiobook-1', 'AUTHOR'),
         ).toEqual({ audiobookExists: true, allowed: true, organizationId: 'org-1' });
      });

      it('canCreateChapter denies author not linked to audiobook organization', async () => {
         mockPrisma.audioBook.findUnique.mockResolvedValue({ organizationId: 'org-1' });
         mockPrisma.author.findUnique.mockResolvedValue({ id: 'author-1' });
         mockPrisma.authorOrganization.findUnique.mockResolvedValue(null);

         expect(
            await service.canCreateChapter('auth-user-1', 'profile-1', 'audiobook-1', 'AUTHOR'),
         ).toEqual({ audiobookExists: true, allowed: false, organizationId: 'org-1' });
      });

      it('canCreateChapter allows authenticated user when audiobook has no organization', async () => {
         mockPrisma.audioBook.findUnique.mockResolvedValue({ organizationId: null });

         expect(
            await service.canCreateChapter('auth-user-1', 'profile-1', 'audiobook-1', 'LISTENER'),
         ).toEqual({ audiobookExists: true, allowed: true, organizationId: null });
      });

      it('canCreateChapter returns not-allowed when audiobook is unknown', async () => {
         mockPrisma.audioBook.findUnique.mockResolvedValue(null);

         expect(
            await service.canCreateChapter('auth-user-1', 'profile-1', 'missing-audiobook', 'AUTHOR'),
         ).toEqual({ audiobookExists: false, allowed: false });
      });
   });
});
