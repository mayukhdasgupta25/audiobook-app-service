/**
 * OrganizationService Tests
 * Unit tests for the organization business logic and authorization rules.
 */
import { OrganizationService } from '../../services/OrganizationService';
import { ApiError } from '../../types/ApiError';
import { OrganizationRole } from '@prisma/client';

// Mock message keys are returned as-is so assertions can match on key names.
jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
      getSuccessMessage: (key: string) => key,
   },
}));

// Helper to build a mock prisma client tailored to OrganizationService usage.
function buildMockPrisma() {
   return {
      organization: {
         findUnique: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
      },
      organizationMember: {
         findUnique: jest.fn(),
         findMany: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
         count: jest.fn(),
      },
      userProfile: {
         findUnique: jest.fn(),
      },
      audioBook: {
         findMany: jest.fn(),
      },
      // The service uses prisma.$transaction with an interactive callback.
      // We expose it on the same shape and forward to the callback with
      // the same mock client so tests can configure expectations naturally.
      $transaction: jest.fn(),
   } as any;
}

describe('OrganizationService', () => {
   let mockPrisma: ReturnType<typeof buildMockPrisma>;
   let service: OrganizationService;

   beforeEach(() => {
      mockPrisma = buildMockPrisma();
      // By default, $transaction forwards to the same mock client so
      // tests don't have to wire up a dedicated tx variant.
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
      service = new OrganizationService(mockPrisma);
   });

   // ----------------------------------------------------------------
   // createOrganization
   // ----------------------------------------------------------------
   describe('createOrganization', () => {
      it('creates an organization and adds the creator as OWNER', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'u1' });
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.organization.create.mockResolvedValue({
            id: 'org1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            ownerId: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.createOrganization('u1', {
            name: 'Acme',
            slug: 'acme',
         });

         expect(result.id).toBe('org1');
         expect(result.ownerId).toBe('u1');
         expect(mockPrisma.organization.create).toHaveBeenCalledWith(
            expect.objectContaining({
               data: expect.objectContaining({
                  name: 'Acme',
                  slug: 'acme',
                  ownerId: 'u1',
                  members: { create: { userProfileId: 'u1', role: OrganizationRole.OWNER } },
               }),
            })
         );
      });

      it('normalizes slug to lowercase and trims name', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'u1' });
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         mockPrisma.organization.create.mockResolvedValue({
            id: 'org1',
            name: 'Acme',
            slug: 'acme-audio',
            description: null,
            ownerId: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         await service.createOrganization('u1', {
            name: '  Acme  ',
            slug: 'Acme-Audio',
         });

         const callArgs = mockPrisma.organization.create.mock.calls[0][0];
         expect(callArgs.data.name).toBe('Acme');
         expect(callArgs.data.slug).toBe('acme-audio');
      });

      it('rejects empty name', async () => {
         await expect(
            service.createOrganization('u1', { name: '   ', slug: 'acme' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects invalid slug characters', async () => {
         await expect(
            service.createOrganization('u1', { name: 'Acme', slug: 'invalid slug!' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('throws conflict when slug already taken', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'u1' });
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1', slug: 'acme' });

         await expect(
            service.createOrganization('u1', { name: 'Acme', slug: 'acme' })
         ).rejects.toMatchObject({ statusCode: 409 });
      });

      it('throws not found if creator user profile missing', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue(null);
         await expect(
            service.createOrganization('missing', { name: 'Acme', slug: 'acme' })
         ).rejects.toMatchObject({ statusCode: 404 });
      });
   });

   // ----------------------------------------------------------------
   // getOrganizationsForUser
   // ----------------------------------------------------------------
   describe('getOrganizationsForUser', () => {
      it('returns memberships with embedded role', async () => {
         mockPrisma.organizationMember.findMany.mockResolvedValue([
            {
               id: 'm1',
               organizationId: 'org1',
               userProfileId: 'u1',
               role: OrganizationRole.OWNER,
               createdAt: new Date(),
               updatedAt: new Date(),
               organization: {
                  id: 'org1',
                  name: 'Acme',
                  slug: 'acme',
                  description: null,
                  ownerId: 'u1',
                  createdAt: new Date(),
                  updatedAt: new Date(),
               },
            },
            {
               id: 'm2',
               organizationId: 'org2',
               userProfileId: 'u1',
               role: OrganizationRole.MEMBER,
               createdAt: new Date(),
               updatedAt: new Date(),
               organization: {
                  id: 'org2',
                  name: 'Beta',
                  slug: 'beta',
                  description: null,
                  ownerId: 'u2',
                  createdAt: new Date(),
                  updatedAt: new Date(),
               },
            },
         ]);

         const result = await service.getOrganizationsForUser('u1');
         expect(result).toHaveLength(2);
         expect(result[0]!.memberRole).toBe(OrganizationRole.OWNER);
         expect(result[1]!.memberRole).toBe(OrganizationRole.MEMBER);
      });

      it('returns empty array when user has no memberships', async () => {
         mockPrisma.organizationMember.findMany.mockResolvedValue([]);
         const result = await service.getOrganizationsForUser('u1');
         expect(result).toEqual([]);
      });
   });

   // ----------------------------------------------------------------
   // getOrganizationById
   // ----------------------------------------------------------------
   describe('getOrganizationById', () => {
      it('returns organization when caller is a member', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({
            id: 'org1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            ownerId: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
         });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.MEMBER,
         });

         const result = await service.getOrganizationById('org1', 'u2');
         expect(result.id).toBe('org1');
      });

      it('throws FORBIDDEN when caller is not a member', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({
            id: 'org1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            ownerId: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
         });
         mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

         await expect(service.getOrganizationById('org1', 'stranger')).rejects.toMatchObject({
            statusCode: 403,
         });
      });

      it('throws NOT_FOUND when organization missing', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue(null);
         await expect(service.getOrganizationById('missing', 'u1')).rejects.toMatchObject({
            statusCode: 404,
         });
      });
   });

   // ----------------------------------------------------------------
   // updateOrganization
   // ----------------------------------------------------------------
   describe('updateOrganization', () => {
      it('allows OWNER to update', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.OWNER,
         });
         mockPrisma.organization.update.mockResolvedValue({
            id: 'org1',
            name: 'New Name',
            slug: 'acme',
            description: null,
            ownerId: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.updateOrganization('org1', 'u1', { name: 'New Name' });
         expect(result.name).toBe('New Name');
      });

      it('allows ADMIN to update', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.ADMIN,
         });
         mockPrisma.organization.update.mockResolvedValue({
            id: 'org1',
            name: 'New Name',
            slug: 'acme',
            description: null,
            ownerId: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.updateOrganization('org1', 'admin', { name: 'New Name' });
         expect(result.name).toBe('New Name');
      });

      it('forbids MEMBER from updating', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.MEMBER,
         });
         await expect(
            service.updateOrganization('org1', 'u1', { name: 'Hax' })
         ).rejects.toMatchObject({ statusCode: 403 });
      });

      it('rejects update with no fields', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.OWNER,
         });
         await expect(service.updateOrganization('org1', 'u1', {})).rejects.toMatchObject({
            statusCode: 400,
         });
      });

      it('clears description when explicitly set to null', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.OWNER,
         });
         mockPrisma.organization.update.mockResolvedValue({
            id: 'org1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            ownerId: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         await service.updateOrganization('org1', 'u1', { description: null });
         expect(mockPrisma.organization.update).toHaveBeenCalledWith({
            where: { id: 'org1' },
            data: { description: null },
         });
      });
   });

   // ----------------------------------------------------------------
   // deleteOrganization
   // ----------------------------------------------------------------
   describe('deleteOrganization', () => {
      it('allows OWNER to delete', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.OWNER,
         });
         mockPrisma.organization.delete.mockResolvedValue({});

         await expect(service.deleteOrganization('org1', 'u1')).resolves.toBeUndefined();
         expect(mockPrisma.organization.delete).toHaveBeenCalledWith({ where: { id: 'org1' } });
      });

      it('forbids ADMIN from deleting', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm1',
            role: OrganizationRole.ADMIN,
         });
         await expect(service.deleteOrganization('org1', 'u1')).rejects.toMatchObject({
            statusCode: 403,
         });
      });
   });

   // ----------------------------------------------------------------
   // addMember
   // ----------------------------------------------------------------
   describe('addMember', () => {
      it('adds a new member with default MEMBER role', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm1', role: OrganizationRole.OWNER }) // assertRole
            .mockResolvedValueOnce(null); // existing check
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'target' });
         mockPrisma.organizationMember.create.mockResolvedValue({
            id: 'm2',
            organizationId: 'org1',
            userProfileId: 'target',
            role: OrganizationRole.MEMBER,
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.addMember('org1', 'u1', { userProfileId: 'target' });
         expect(result.role).toBe(OrganizationRole.MEMBER);
      });

      it('rejects duplicate membership', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm1', role: OrganizationRole.OWNER })
            .mockResolvedValueOnce({ id: 'm2', role: OrganizationRole.MEMBER });
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'target' });

         await expect(
            service.addMember('org1', 'u1', { userProfileId: 'target' })
         ).rejects.toMatchObject({ statusCode: 409 });
      });

      it('rejects invalid role', async () => {
         await expect(
            service.addMember('org1', 'u1', {
               userProfileId: 'target',
               role: 'SUPERUSER' as any,
            })
         ).rejects.toMatchObject({ statusCode: 400 });
      });

      it('forbids MEMBER from adding other members', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            id: 'm1',
            role: OrganizationRole.MEMBER,
         });

         await expect(
            service.addMember('org1', 'u1', { userProfileId: 'target' })
         ).rejects.toMatchObject({ statusCode: 403 });
      });
   });

   // ----------------------------------------------------------------
   // updateMemberRole
   // ----------------------------------------------------------------
   describe('updateMemberRole', () => {
      it('promotes member to ADMIN', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.OWNER }) // assertRole
            .mockResolvedValueOnce({
               id: 'm-target',
               role: OrganizationRole.MEMBER,
            }); // target lookup
         mockPrisma.organizationMember.update.mockResolvedValue({
            id: 'm-target',
            organizationId: 'org1',
            userProfileId: 'target',
            role: OrganizationRole.ADMIN,
            createdAt: new Date(),
            updatedAt: new Date(),
         });

         const result = await service.updateMemberRole(
            'org1',
            'u1',
            'target',
            OrganizationRole.ADMIN
         );
         expect(result.role).toBe(OrganizationRole.ADMIN);
      });

      it('transfers ownership when promoting another member to OWNER', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.OWNER })
            .mockResolvedValueOnce({ id: 'm-target', role: OrganizationRole.ADMIN });
         // Inside the transaction these are called sequentially. The final
         // return value of $transaction is whatever the callback returns;
         // here we make the second update resolve to the new owner row.
         mockPrisma.organizationMember.update
            .mockResolvedValueOnce({}) // demote previous owner
            .mockResolvedValueOnce({
               id: 'm-target',
               organizationId: 'org1',
               userProfileId: 'target',
               role: OrganizationRole.OWNER,
               createdAt: new Date(),
               updatedAt: new Date(),
            });
         mockPrisma.organization.update.mockResolvedValue({ id: 'org1', ownerId: 'target' });

         const result = await service.updateMemberRole(
            'org1',
            'u1',
            'target',
            OrganizationRole.OWNER
         );

         expect(result.role).toBe(OrganizationRole.OWNER);
         expect(mockPrisma.organization.update).toHaveBeenCalledWith({
            where: { id: 'org1' },
            data: { ownerId: 'target' },
         });
      });

      it('refuses to demote the only OWNER', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.OWNER })
            .mockResolvedValueOnce({ id: 'm-target', role: OrganizationRole.OWNER });
         mockPrisma.organizationMember.count.mockResolvedValue(1);

         await expect(
            service.updateMemberRole('org1', 'u1', 'u1', OrganizationRole.MEMBER)
         ).rejects.toMatchObject({ statusCode: 400 });
      });

      it('forbids ADMIN from updating roles', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            id: 'm-self',
            role: OrganizationRole.ADMIN,
         });

         await expect(
            service.updateMemberRole('org1', 'admin', 'target', OrganizationRole.MEMBER)
         ).rejects.toMatchObject({ statusCode: 403 });
      });
   });

   // ----------------------------------------------------------------
   // removeMember
   // ----------------------------------------------------------------
   describe('removeMember', () => {
      it('allows OWNER to remove a regular member', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.OWNER })
            .mockResolvedValueOnce({ id: 'm-target', role: OrganizationRole.MEMBER });
         mockPrisma.organizationMember.delete.mockResolvedValue({});

         await expect(
            service.removeMember('org1', 'u1', 'target')
         ).resolves.toBeUndefined();
         expect(mockPrisma.organizationMember.delete).toHaveBeenCalled();
      });

      it('allows a member to remove themselves (leave)', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.MEMBER })
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.MEMBER });
         mockPrisma.organizationMember.delete.mockResolvedValue({});

         await expect(
            service.removeMember('org1', 'u1', 'u1')
         ).resolves.toBeUndefined();
      });

      it('refuses to remove an OWNER even when self-removing', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.OWNER })
            .mockResolvedValueOnce({ id: 'm-self', role: OrganizationRole.OWNER });

         await expect(
            service.removeMember('org1', 'u1', 'u1')
         ).rejects.toMatchObject({ statusCode: 400 });
      });

      it('forbids a MEMBER from removing another member', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
            id: 'm-self',
            role: OrganizationRole.MEMBER,
         });

         await expect(
            service.removeMember('org1', 'u1', 'target')
         ).rejects.toMatchObject({ statusCode: 403 });
      });
   });

   // ----------------------------------------------------------------
   // getMembers / getOrganizationAudioBooks
   // ----------------------------------------------------------------
   describe('getMembers', () => {
      it('returns members when caller is a member', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm-self',
            role: OrganizationRole.MEMBER,
         });
         mockPrisma.organizationMember.findMany.mockResolvedValue([
            {
               id: 'm1',
               organizationId: 'org1',
               userProfileId: 'u1',
               role: OrganizationRole.OWNER,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         ]);

         const result = await service.getMembers('org1', 'u1');
         expect(result).toHaveLength(1);
         expect(result[0]!.role).toBe(OrganizationRole.OWNER);
      });

      it('forbids non-members', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

         await expect(
            service.getMembers('org1', 'stranger')
         ).rejects.toMatchObject({ statusCode: 403 });
      });
   });

   describe('getOrganizationAudioBooks', () => {
      it('returns audiobooks owned by the organization', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue({
            id: 'm-self',
            role: OrganizationRole.MEMBER,
         });
         mockPrisma.audioBook.findMany.mockResolvedValue([
            {
               id: 'a1',
               title: 'Book 1',
               author: 'Author',
               narrator: null,
               description: null,
               duration: null,
               fileSize: null,
               coverImage: null,
               language: 'bn',
               publisher: null,
               publishDate: null,
               isbn: null,
               isActive: true,
               isPublic: true,
               isOfflineAvailable: false,
               organizationId: 'org1',
               createdAt: new Date(),
               updatedAt: new Date(),
               scheduledAt: null,
               audiobookTags: [],
               audioBookGenres: [],
            },
         ]);

         const result = await service.getOrganizationAudioBooks('org1', 'u1');
         expect(result).toHaveLength(1);
         expect(result[0]!.organizationId).toBe('org1');
      });

      it('forbids non-members', async () => {
         mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1' });
         mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

         await expect(
            service.getOrganizationAudioBooks('org1', 'stranger')
         ).rejects.toMatchObject({ statusCode: 403 });
      });
   });
});
