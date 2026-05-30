import { toCommentDto } from '../../models/CommentDto';

describe('CommentDto', () => {
   it('maps user profile fields into the user object', () => {
      const dto = toCommentDto({
         id: 'comment-1',
         userProfileId: 'profile-1',
         audiobookId: 'book-1',
         parentId: null,
         content: 'Great narration',
         meta: { position: 120 },
         createdAt: new Date('2024-01-01T00:00:00Z'),
         updatedAt: new Date('2024-01-02T00:00:00Z'),
         userProfile: {
            firstName: 'Jane',
            lastName: 'Doe',
            avatar: 'https://example.com/avatar.png',
         },
      });

      expect(dto.user).toEqual({
         firstName: 'Jane',
         lastName: 'Doe',
         avatar: 'https://example.com/avatar.png',
      });
   });
});
