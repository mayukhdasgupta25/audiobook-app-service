/**
 * OrganizationDto Tests
 *
 * Verifies the Prisma -> DTO conversion helpers used by API responses.
 */
import {
   parseTeamSizeFromApi,
   teamSizeToApi,
   toOrganizationDto,
   toOrganizationMemberDto,
} from '../../models/OrganizationDto';
import { OrganizationRole, OrganizationTeamSize } from '@prisma/client';

describe('OrganizationDto', () => {
   describe('team size mappers', () => {
      it('maps API team size strings to Prisma enum values', () => {
         expect(parseTeamSizeFromApi('11-50')).toBe(OrganizationTeamSize.SIZE_11_50);
         expect(teamSizeToApi(OrganizationTeamSize.SIZE_200_PLUS)).toBe('200+');
      });

      it('throws for invalid API team size strings', () => {
         expect(() => parseTeamSizeFromApi('invalid')).toThrow('INVALID_TEAM_SIZE');
      });
   });

   describe('toOrganizationDto', () => {
      it('converts a Prisma Organization into a DTO', () => {
         const result = toOrganizationDto({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: 'A test org',
            image: null,
            websiteUrl: null,
            teamSize: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         } as any);

         expect(result).toEqual({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: 'A test org',
            image: null,
            preferredGenre: null,
            websiteUrl: null,
            teamSize: null,
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
            image: null,
            websiteUrl: null,
            teamSize: null,
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
            image: null,
            websiteUrl: null,
            teamSize: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 5 },
         } as any);
         expect(result.memberCount).toBe(5);
      });

      it('maps team size enum and preferred genre name', () => {
         const result = toOrganizationDto({
            id: 'org-1',
            name: 'Acme',
            slug: 'acme',
            description: null,
            image: null,
            preferredGenre: 'Fiction',
            websiteUrl: 'https://acme.example.com',
            teamSize: OrganizationTeamSize.SIZE_1_10,
            createdAt: new Date(),
            updatedAt: new Date(),
         } as any);

         expect(result.teamSize).toBe('1-10');
         expect(result.websiteUrl).toBe('https://acme.example.com');
         expect(result.preferredGenre).toBe('Fiction');
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
               image: null,
               websiteUrl: null,
               teamSize: null,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         } as any);

         expect(result.organization).toBeDefined();
         expect(result.organization?.name).toBe('Acme');
      });
   });
});
