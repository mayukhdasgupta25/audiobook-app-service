/**
 * OrganizationDto Tests
 *
 * Verifies the Prisma -> DTO conversion helpers used by API responses.
 */
import {
   toOrganizationDto,
   toOrganizationMemberDto,
} from '../../models/OrganizationDto';
import { OrganizationRole } from '@prisma/client';

describe('OrganizationDto', () => {
   describe('toOrganizationDto', () => {
      it('converts a Prisma Organization into a DTO', () => {
         const result = toOrganizationDto({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: 'A test org',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         } as any);

         expect(result).toEqual({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: 'A test org',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            memberCount: undefined,
         });
      });

      it('returns description as undefined when null', () => {
         const result = toOrganizationDto({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
         } as any);
         expect(result.description).toBeUndefined();
      });

      it('includes memberCount when _count is supplied', () => {
         const result = toOrganizationDto({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 5 },
         } as any);
         expect(result.memberCount).toBe(5);
      });
   });

   describe('toOrganizationMemberDto', () => {
      it('converts a member without nested organization', () => {
         const result = toOrganizationMemberDto({
            id: 'm-1',
            organizationId: 'o-1',
            userProfileId: 'u-1',
            role: OrganizationRole.MEMBER,
            joinedAt: new Date('2024-01-01'),
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
         } as any);

         expect(result.id).toBe('m-1');
         expect(result.organizationId).toBe('o-1');
         expect(result.userProfileId).toBe('u-1');
         expect(result.role).toBe(OrganizationRole.MEMBER);
         expect(result.organization).toBeUndefined();
      });

      it('nests organization when included', () => {
         const result = toOrganizationMemberDto({
            id: 'm-1',
            organizationId: 'o-1',
            userProfileId: 'u-1',
            role: OrganizationRole.ADMIN,
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            organization: {
               id: 'o-1',
               name: 'Acme',
               slug: 'acme',
               description: null,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         } as any);

         expect(result.organization).toBeDefined();
         expect(result.organization?.name).toBe('Acme');
      });
   });
});
