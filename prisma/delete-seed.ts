import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
   console.log('🗑️ Starting database cleanup...');
   console.log('⚠️  WARNING: This will delete ALL data from ALL tables!');
   console.log('');

   try {
      // Get counts before deletion for logging
      const counts = {
         audiobooks: await prisma.audioBook.count(),
         chapters: await prisma.chapter.count(),
         genres: await prisma.genre.count(),
         tags: await prisma.tag.count(),
         playlists: await prisma.playlist.count(),
         reviews: await prisma.review.count(),
         favorites: await prisma.favorite.count(),
         bookmarks: await prisma.bookmark.count(),
         notes: await prisma.note.count(),
         offlineDownloads: await prisma.offlineDownload.count(),
         listeningHistory: await prisma.listeningHistory.count(),
         chapterProgress: await prisma.chapterProgress.count(),
         userAudioBooks: await prisma.userAudioBook.count(),
         playlistItems: await prisma.playlistItem.count(),
         audiobookTags: await prisma.audioBookTag.count()
      };

      console.log('📊 Current data counts:');
      Object.entries(counts).forEach(([table, count]) => {
         if (count > 0) {
            console.log(`   ${table}: ${count} records`);
         }
      });
      console.log('');

      // Delete in reverse order of dependencies to avoid foreign key constraints

      // Delete user-related data first
      console.log('Deleting user-audiobook relationships...');
      await prisma.userAudioBook.deleteMany();

      console.log('Deleting playlist items...');
      await prisma.playlistItem.deleteMany();

      console.log('Deleting playlists...');
      await prisma.playlist.deleteMany();

      console.log('Deleting reviews...');
      await prisma.review.deleteMany();

      console.log('Deleting favorites...');
      await prisma.favorite.deleteMany();

      console.log('Deleting listening history...');
      await prisma.listeningHistory.deleteMany();

      console.log('Deleting chapter progress...');
      await prisma.chapterProgress.deleteMany();

      console.log('Deleting bookmarks...');
      await prisma.bookmark.deleteMany();

      console.log('Deleting notes...');
      await prisma.note.deleteMany();

      console.log('Deleting offline downloads...');
      await prisma.offlineDownload.deleteMany();

      console.log('Deleting audiobook tags...');
      await prisma.audioBookTag.deleteMany();

      console.log('Deleting chapters...');
      await prisma.chapter.deleteMany();

      console.log('Deleting audiobooks...');
      await prisma.audioBook.deleteMany();

      console.log('Deleting tags...');
      await prisma.tag.deleteMany();

      console.log('Deleting genres...');
      await prisma.genre.deleteMany();


      console.log('');
      console.log('✅ Database cleanup completed successfully!');
      console.log('All tables have been emptied.');
      console.log('');
      console.log('💡 To repopulate the database, run: npm run db:seed');

   } catch (error) {
      console.error('❌ Error during database cleanup:', error);
      throw error;
   }
}

main()
   .catch((e) => {
      console.error('❌ Database cleanup failed:', e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
