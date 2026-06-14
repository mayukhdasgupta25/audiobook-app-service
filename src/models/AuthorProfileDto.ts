export interface AuthorProfileDto {
   id: string;
   authorId: string;
   avatar?: string | null;
   imageAssets?: Record<string, string>;
   createdAt: Date;
   updatedAt: Date;
}

export interface UpdateAuthorProfileDto {
   avatar?: string | null;
}

export function toAuthorProfileDto(profile: {
   id: string;
   authorId: string;
   avatar: string | null;
   createdAt: Date;
   updatedAt: Date;
}): AuthorProfileDto {
   return {
      id: profile.id,
      authorId: profile.authorId,
      avatar: profile.avatar,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
   };
}
