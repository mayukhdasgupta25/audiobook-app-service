/**
 * Hydrates audiobook owner details from auth-service and app AuthorProfile.
 */
import { PrismaClient } from '@prisma/client';
import { authClient, AuthAuthorCatalogInfo, AuthOrganizationCatalogInfo } from '../clients/AuthClient';
import {
   AudioBookDto,
   AudioBookOwnerAuthorDetails,
   AudioBookOwnerOrganizationDetails,
} from '../models/AudioBookDto';
import { fileUrlService } from './FileUrlService';

export class AudioBookOwnerService {
   constructor(private prisma: PrismaClient) {}

   async attachOwnerDetails(
      dtos: AudioBookDto[],
      accessToken?: string,
   ): Promise<AudioBookDto[]> {
      if (dtos.length === 0) {
         return dtos;
      }

      if (!accessToken) {
         return dtos;
      }

      const organizationIds = new Set<string>();
      const authorIds = new Set<string>();

      for (const dto of dtos) {
         if (dto.owner.type === 'ORGANIZATION') {
            organizationIds.add(dto.owner.id);
         } else {
            authorIds.add(dto.owner.id);
         }
      }

      const [organizations, authors, authorProfiles] = await Promise.all([
         this.fetchOrganizations([...organizationIds], accessToken),
         this.fetchAuthors([...authorIds], accessToken),
         authorIds.size > 0
            ? this.prisma.authorProfile.findMany({
               where: { authorId: { in: [...authorIds] } },
               select: { authorId: true, avatar: true },
            })
            : Promise.resolve([]),
      ]);

      const orgMap = new Map(organizations.map((org) => [org.id, org]));
      const authorMap = new Map(authors.map((author) => [author.id, author]));
      const avatarMap = new Map(authorProfiles.map((p) => [p.authorId, p.avatar]));

      return Promise.all(
         dtos.map(async (dto) => {
            if (dto.owner.type === 'ORGANIZATION') {
               const org = orgMap.get(dto.owner.id);
               if (!org) {
                  return dto;
               }
               const organization = await this.mapOrganizationDetails(org);
               return {
                  ...dto,
                  owner: {
                     ...dto.owner,
                     organization,
                  },
               };
            }

            const author = authorMap.get(dto.owner.id);
            if (!author) {
               return dto;
            }

            const avatarStored = avatarMap.get(dto.owner.id);
            const avatar = avatarStored
               ? await fileUrlService.resolveForClient(avatarStored)
               : undefined;
            const imageAssets = await fileUrlService.resolveImageAssetsForEntity('author', dto.owner.id);

            const authorDetails: AudioBookOwnerAuthorDetails = {
               id: author.id,
               slug: author.slug,
               userId: author.userId,
               firstName: author.firstName ?? null,
               lastName: author.lastName ?? null,
               ...(avatar !== undefined ? { avatar: avatar ?? null } : {}),
               imageAssets,
            };

            return {
               ...dto,
               owner: {
                  ...dto.owner,
                  author: authorDetails,
               },
            };
         }),
      );
   }

   async attachOwnerDetail(
      dto: AudioBookDto,
      accessToken?: string,
   ): Promise<AudioBookDto> {
      const [hydrated] = await this.attachOwnerDetails([dto], accessToken);
      return hydrated ?? dto;
   }

   private async fetchOrganizations(
      ids: string[],
      accessToken: string,
   ): Promise<AuthOrganizationCatalogInfo[]> {
      const results = await Promise.all(
         ids.map((id) => authClient.getOrganizationCatalogById(id, accessToken).catch(() => null)),
      );
      return results.filter((org): org is AuthOrganizationCatalogInfo => org !== null);
   }

   private async fetchAuthors(
      ids: string[],
      accessToken: string,
   ): Promise<AuthAuthorCatalogInfo[]> {
      const results = await Promise.all(
         ids.map((id) => authClient.getAuthorCatalogById(id, accessToken).catch(() => null)),
      );
      return results.filter((author): author is AuthAuthorCatalogInfo => author !== null);
   }

   private async mapOrganizationDetails(
      org: AuthOrganizationCatalogInfo,
   ): Promise<AudioBookOwnerOrganizationDetails> {
      const image = org.image
         ? await fileUrlService.resolveForClient(org.image)
         : undefined;

      return {
         id: org.id,
         name: org.name,
         slug: org.slug,
         description: org.description ?? null,
         preferredGenre: org.preferredGenre ?? null,
         websiteUrl: org.websiteUrl ?? null,
         teamSize: org.teamSize ?? null,
         ...(image !== undefined ? { image: image ?? null } : {}),
         imageAssets: org.imageAssets ?? {},
      };
   }
}
