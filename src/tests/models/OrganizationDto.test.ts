/**
 * OrganizationDto mapper tests
 */
import {
   toOrganizationDto,
   toOrganizationMemberDto,
   toOrganizationWithMembershipDto,
} from '../../models/OrganizationDto';
import { OrganizationRole } from '@prisma/client';

describe('OrganizationDto mappers', () => {
   const baseOrg = {
      id: 'org1',
      name: 'Acme',
      slug: 'acme',
      description: 'Audio company',
      ownerId: 'u1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
   };

   describe('toOrganizationDto', () => {
      it('maps all fields including nullable description', () => {
         const dto = toOrganizationDto(baseOrg);
         expect(dto).toEqual({
            id: 'org1',
            name: 'Acme',
            slug: 'acme',
            description: 'Audio company',
            ownerId: 'u1',
            createdAt: baseOrg.createdAt,
            updatedAt: baseOrg.updatedAt,
         });
      });

      it('preserves null description', () => {
         const dto = toOrganizationDto({ ...baseOrg, description: null });
         expect(dto.description).toBeNull();
      });
   });

   describe('toOrganizationWithMembershipDto', () => {
      it('embeds the caller role', () => {
         const dto = toOrganizationWithMembershipDto(baseOrg, OrganizationRole.ADMIN);
         expect(dto.memberRole).toBe(OrganizationRole.ADMIN);
         expect(dto.id).toBe('org1');
      });
   });

   describe('toOrganizationMemberDto', () => {
      it('maps prisma member to dto', () => {
         const member = {
            id: 'm1',
            organizationId: 'org1',
            userProfileId: 'u1',
            role: OrganizationRole.OWNER,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-02T00:00:00Z'),
         };

         const dto = toOrganizationMemberDto(member);
         expect(dto).toEqual({
            id: 'm1',
            organizationId: 'org1',
            userProfileId: 'u1',
            role: OrganizationRole.OWNER,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
         });
      });
   });
});
