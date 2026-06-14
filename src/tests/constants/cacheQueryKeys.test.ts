import { buildCacheInvalidationEvent } from '../../constants/cacheQueryKeys';

describe('buildCacheInvalidationEvent (app)', () => {
   it('builds audiobook updated keys', () => {
      const event = buildCacheInvalidationEvent('audiobook', 'updated', 'ab-1');

      expect(event.service).toBe('app');
      expect(event.queryKeys).toEqual(
         expect.arrayContaining([
            ['audiobooks'],
            ['audiobooks', 'ab-1'],
         ]),
      );
   });

   it('builds chapter created keys with parent audiobook', () => {
      const event = buildCacheInvalidationEvent('chapter', 'created', 'ch-1', { audiobookId: 'ab-1' });

      expect(event.queryKeys).toEqual(
         expect.arrayContaining([
            ['audiobooks', 'ab-1', 'chapters'],
            ['audiobooks', 'ab-1'],
            ['audiobooks'],
         ]),
      );
   });

   it('builds genre updated keys including catalog list', () => {
      const event = buildCacheInvalidationEvent('genre', 'updated', 'genre-1');

      expect(event.queryKeys).toEqual(
         expect.arrayContaining([
            ['genres'],
            ['genres', 'genre-1'],
            ['audiobooks'],
         ]),
      );
   });
});
