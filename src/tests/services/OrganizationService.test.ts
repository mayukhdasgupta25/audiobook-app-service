/**
 * OrganizationService Tests
 *
 * Verifies CRUD, slug normalization, member management and access checks.
 * The Prisma client is fully mocked so these tests run without a database.
 */
import { OrganizationService } from '../../services/OrganizationService';
import { ApiError } from '../../types/ApiError';
import { OrganizationRole } from '@prisma/client';

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
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
            data: { name: 'Acme', slug: 'acme', description: null },
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
         expect(mockPrisma.organization.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ slug: 'my-cool-org' }),
         });
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

   describe('addMember', () => {
      it('adds a member as MEMBER by default', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o' });
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'u' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
         mockPrisma.organizationMember.create.mockResolvedValue({
            id: 'm',
            organizationId: 'o',
            userProfileId: 'u',
            role: OrganizationRole.MEMBER,
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.addMember('o', 'u');
         expect(result.role).toBe(OrganizationRole.MEMBER);
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
            service.updateMemberRole('o', 'u', OrganizationRole.MEMBER)
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
            role: OrganizationRole.MEMBER,
         });
         mockPrisma.organizationMember.delete.mockResolvedValue({});
         await service.removeMember('o', 'u');
         expect(mockPrisma.organizationMember.delete).toHaveBeenCalled();
      });
   });

   describe('access checks', () => {
      it('isMember returns true when membership exists', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            role: OrganizationRole.MEMBER,
         });
         expect(await service.isMember('o', 'u')).toBe(true);
      });

      it('isMember returns false when membership is missing', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
         expect(await service.isMember('o', 'u')).toBe(false);
      });

      it('isAdmin returns true for OWNER and ADMIN only', async () => {
         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            role: OrganizationRole.OWNER,
         });
         expect(await service.isAdmin('o', 'u')).toBe(true);

         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            role: OrganizationRole.ADMIN,
         });
         expect(await service.isAdmin('o', 'u')).toBe(true);

         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            role: OrganizationRole.MEMBER,
         });
         expect(await service.isAdmin('o', 'u')).toBe(false);
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
   });
});
