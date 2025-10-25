import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
   console.log('🌱 Starting database seeding...');

   // Create a test user profile with external userId
   const testUserId = 'external-user-123'; // This will be supplied by external auth service

   // Create a test user profile
   const userProfile = await prisma.userProfile.upsert({
      where: { userId: testUserId },
      update: {},
      create: {
         userId: testUserId,
         username: 'testuser',
         firstName: 'Test',
         lastName: 'User',
         preferences: {
            theme: 'dark',
            language: 'en',
            autoPlay: true,
            playbackSpeed: 1.0
         }
      },
   });

   console.log('✅ Created test user profile:', userProfile.username);

   // Create Tags first
   const trendingTag = await prisma.tag.upsert({
      where: { name: 'Trending' },
      update: {},
      create: {
         name: 'Trending',
         type: 'TRENDING'
      }
   });

   const newReleasesTag = await prisma.tag.upsert({
      where: { name: 'New Releases' },
      update: {},
      create: {
         name: 'New Releases',
         type: 'NEW_RELEASES'
      }
   });

   console.log('✅ Created tags');

   // Create Genres
   const genres = [
      'Poetry',
      'Novel',
      'Fiction',
      'Folklore',
      'Urban Fiction',
      'Crime',
      'Thriller',
      'Philosophy',
      'Religious'
   ];

   const createdGenres: Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }> = [];
   for (const genreName of genres) {
      const genre = await prisma.genre.upsert({
         where: { name: genreName },
         update: {},
         create: {
            name: genreName
         }
      });
      createdGenres.push(genre);
   }

   console.log('✅ Created genres:', createdGenres.map(g => g.name));

   // Sample audiobook data with diverse genres, authors, and narrators
   const audiobookData = [
      // New Releases Only (20 books)
      {
         id: 'new-release-1',
         title: 'The Thursday Murder Club',
         author: 'Richard Osman',
         narrator: 'Lesley Manville',
         description: 'Four septuagenarians meet weekly to solve cold cases in this charming mystery.',
         duration: 39600, // 11 hours
         fileSize: BigInt(130000000), // 130MB
         coverImage: '/uploads/images/sample-image-1.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Penguin Random House Audio',
         publishDate: new Date('2024-01-10'),
         isbn: '978-0-241-45618-01',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-2',
         title: 'Klara and the Sun',
         author: 'Kazuo Ishiguro',
         narrator: 'Sura Siu',
         description: 'A story told from the perspective of an artificial friend observing human behavior.',
         duration: 36000, // 10 hours
         fileSize: BigInt(115000000), // 115MB
         coverImage: '/uploads/images/sample-image-2.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Random House Audio',
         publishDate: new Date('2024-02-15'),
         isbn: '978-0-593-23080-02',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-3',
         title: 'The Sanatorium',
         author: 'Sarah Pearse',
         narrator: 'Imogen Church',
         description: 'A detective must solve a murder in a remote hotel in the Swiss Alps.',
         duration: 32400, // 9 hours
         fileSize: BigInt(110000000), // 110MB
         coverImage: '/uploads/images/sample-image-3.jpg',
         genre: 'Thriller',
         language: 'en',
         publisher: 'Penguin Random House Audio',
         publishDate: new Date('2024-03-20'),
         isbn: '978-0-593-23080-03',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-4',
         title: 'The Push',
         author: 'Ashley Audrain',
         narrator: 'Marin Ireland',
         description: 'A psychological thriller about motherhood and the dark side of maternal instinct.',
         duration: 28800, // 8 hours
         fileSize: BigInt(95000000), // 95MB
         coverImage: '/uploads/images/sample-image-4.jpg',
         genre: 'Thriller',
         language: 'en',
         publisher: 'Penguin Random House Audio',
         publishDate: new Date('2024-04-25'),
         isbn: '978-0-593-23080-04',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-5',
         title: 'The Last Thing He Told Me',
         author: 'Laura Dave',
         narrator: 'Rebecca Lowman',
         description: 'A woman must protect her stepdaughter after her husband disappears.',
         duration: 25200, // 7 hours
         fileSize: BigInt(85000000), // 85MB
         coverImage: '/uploads/images/sample-image-5.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Simon & Schuster Audio',
         publishDate: new Date('2024-05-30'),
         isbn: '978-1-5011-7890-05',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-6',
         title: 'The Seven Moons of Maali Almeida',
         author: 'Shehan Karunatilaka',
         narrator: 'Vikash Patel',
         description: 'A ghost story set in Sri Lanka during the civil war.',
         duration: 43200, // 12 hours
         fileSize: BigInt(145000000), // 145MB
         coverImage: '/uploads/images/sample-image-6.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'W. F. Howes Ltd',
         publishDate: new Date('2024-06-12'),
         isbn: '978-1-78747-123-06',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-7',
         title: 'The Maid',
         author: 'Nita Prose',
         narrator: 'Lauren Ambrose',
         description: 'A hotel maid becomes the prime suspect in a murder investigation.',
         duration: 28800, // 8 hours
         fileSize: BigInt(95000000), // 95MB
         coverImage: '/uploads/images/sample-image-7.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Random House Audio',
         publishDate: new Date('2024-07-18'),
         isbn: '978-0-593-23080-07',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-8',
         title: 'The Paris Apartment',
         author: 'Lucy Foley',
         narrator: 'Clare Corbett',
         description: 'A woman arrives in Paris to stay with her half-brother, but he\'s missing.',
         duration: 36000, // 10 hours
         fileSize: BigInt(115000000), // 115MB
         coverImage: '/uploads/images/sample-image-8.jpg',
         genre: 'Thriller',
         language: 'en',
         publisher: 'HarperAudio',
         publishDate: new Date('2024-08-25'),
         isbn: '978-0-06-300305-08',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-9',
         title: 'The Dictionary of Lost Words',
         author: 'Pip Williams',
         narrator: 'Pippa Bennett-Warner',
         description: 'A novel about the power of language and the women who helped create the Oxford English Dictionary.',
         duration: 39600, // 11 hours
         fileSize: BigInt(130000000), // 130MB

         coverImage: '/uploads/images/sample-image-9.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Random House Audio',
         publishDate: new Date('2024-09-10'),
         isbn: '978-0-593-23080-09',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-10',
         title: 'The Thursday Murder Club 2',
         author: 'Richard Osman',
         narrator: 'Lesley Manville',
         description: 'The second installment of the Thursday Murder Club series.',
         duration: 43200, // 12 hours
         fileSize: BigInt(145000000), // 145MB

         coverImage: '/uploads/images/sample-image-10.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Penguin Random House Audio',
         publishDate: new Date('2024-10-15'),
         isbn: '978-0-241-45618-10',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-11',
         title: 'The Seven Husbands of Evelyn Hugo',
         author: 'Taylor Jenkins Reid',
         narrator: 'Julia Whelan',
         description: 'A captivating story about a reclusive Hollywood icon and her seven marriages.',
         duration: 37800, // 10.5 hours
         fileSize: BigInt(120000000), // 120MB

         coverImage: '/uploads/images/sample-image-11.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Simon & Schuster Audio',
         publishDate: new Date('2024-01-15'),
         isbn: '978-1-5011-7890-11',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-12',
         title: 'Atomic Habits',
         author: 'James Clear',
         narrator: 'James Clear',
         description: 'An easy and proven way to build good habits and break bad ones.',
         duration: 28800, // 8 hours
         fileSize: BigInt(95000000), // 95MB

         coverImage: '/uploads/images/sample-image-12.jpg',
         genre: 'Philosophy',
         language: 'en',
         publisher: 'Penguin Random House Audio',
         publishDate: new Date('2024-02-20'),
         isbn: '978-0-7352-1129-12',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-13',
         title: 'The Midnight Library',
         author: 'Matt Haig',
         narrator: 'Carey Mulligan',
         description: 'A novel about a library between life and death where you can try different versions of your life.',
         duration: 32400, // 9 hours
         fileSize: BigInt(110000000), // 110MB

         coverImage: '/uploads/images/sample-image-13.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Canongate Books',
         publishDate: new Date('2024-03-10'),
         isbn: '978-1-78689-273-13',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-14',
         title: 'Educated',
         author: 'Tara Westover',
         narrator: 'Julia Whelan',
         description: 'A memoir about a woman who grows up in a survivalist Mormon family.',
         duration: 39600, // 11 hours
         fileSize: BigInt(130000000), // 130MB

         coverImage: '/uploads/images/sample-image-14.jpg',
         genre: 'Novel',
         language: 'en',
         publisher: 'Random House Audio',
         publishDate: new Date('2024-04-05'),
         isbn: '978-0-399-59050-14',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-15',
         title: 'The Silent Patient',
         author: 'Alex Michaelides',
         narrator: 'Jack Hawkins',
         description: 'A psychological thriller about a woman who refuses to speak after allegedly murdering her husband.',
         duration: 36000, // 10 hours
         fileSize: BigInt(115000000), // 115MB

         coverImage: '/uploads/images/sample-image-15.jpg',
         genre: 'Thriller',
         language: 'en',
         publisher: 'Macmillan Audio',
         publishDate: new Date('2024-05-12'),
         isbn: '978-1-250-30169-15',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-16',
         title: 'Becoming',
         author: 'Michelle Obama',
         narrator: 'Michelle Obama',
         description: 'An intimate memoir by the former First Lady of the United States.',
         duration: 72000, // 20 hours
         fileSize: BigInt(240000000), // 240MB

         coverImage: '/uploads/images/sample-image-16.jpg',
         genre: 'Novel',
         language: 'en',
         publisher: 'Random House Audio',
         publishDate: new Date('2024-06-18'),
         isbn: '978-1-5247-6313-16',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-17',
         title: 'The Psychology of Money',
         author: 'Morgan Housel',
         narrator: 'Chris Hill',
         description: 'Timeless lessons on wealth, greed, and happiness.',
         duration: 25200, // 7 hours
         fileSize: BigInt(85000000), // 85MB

         coverImage: '/uploads/images/sample-image-17.jpg',
         genre: 'Philosophy',
         language: 'en',
         publisher: 'Harriman House',
         publishDate: new Date('2024-07-25'),
         isbn: '978-0-85719-768-17',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-18',
         title: 'Project Hail Mary',
         author: 'Andy Weir',
         narrator: 'Ray Porter',
         description: 'A lone astronaut must save the earth from disaster in this science fiction thriller.',
         duration: 50400, // 14 hours
         fileSize: BigInt(170000000), // 170MB

         coverImage: '/uploads/images/sample-image-18.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Audible Studios',
         publishDate: new Date('2024-08-30'),
         isbn: '978-0-593-35737-18',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-19',
         title: 'The Four Agreements',
         author: 'Don Miguel Ruiz',
         narrator: 'Peter Coyote',
         description: 'A practical guide to personal freedom based on ancient Toltec wisdom.',
         duration: 18000, // 5 hours
         fileSize: BigInt(60000000), // 60MB

         coverImage: '/uploads/images/sample-image-19.jpg',
         genre: 'Religious',
         language: 'en',
         publisher: 'Amber-Allen Publishing',
         publishDate: new Date('2024-09-14'),
         isbn: '978-1-878424-31-19',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },
      {
         id: 'new-release-20',
         title: 'The Alchemist',
         author: 'Paulo Coelho',
         narrator: 'Jeremy Irons',
         description: 'A magical fable about following your dreams and listening to your heart.',
         duration: 21600, // 6 hours
         fileSize: BigInt(75000000), // 75MB

         coverImage: '/uploads/images/sample-image-20.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'HarperAudio',
         publishDate: new Date('2024-10-22'),
         isbn: '978-0-06-112241-20',
         isActive: true,
         isPublic: true,
         tags: ['New Releases']
      },

      // Trending Only (10 books)
      {
         id: 'trending-1',
         title: 'The Seven Husbands of Evelyn Hugo',
         author: 'Taylor Jenkins Reid',
         narrator: 'Julia Whelan',
         description: 'A captivating story about a reclusive Hollywood icon and her seven marriages.',
         duration: 37800, // 10.5 hours
         fileSize: BigInt(120000000), // 120MB

         coverImage: '/uploads/images/sample-image-21.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Simon & Schuster Audio',
         publishDate: new Date('2023-01-15'),
         isbn: '978-1-5011-7890-21',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-2',
         title: 'Atomic Habits',
         author: 'James Clear',
         narrator: 'James Clear',
         description: 'An easy and proven way to build good habits and break bad ones.',
         duration: 28800, // 8 hours
         fileSize: BigInt(95000000), // 95MB

         coverImage: '/uploads/images/sample-image-22.jpg',
         genre: 'Philosophy',
         language: 'en',
         publisher: 'Penguin Random House Audio',
         publishDate: new Date('2023-02-20'),
         isbn: '978-0-7352-1129-22',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-3',
         title: 'The Midnight Library',
         author: 'Matt Haig',
         narrator: 'Carey Mulligan',
         description: 'A novel about a library between life and death where you can try different versions of your life.',
         duration: 32400, // 9 hours
         fileSize: BigInt(110000000), // 110MB

         coverImage: '/uploads/images/sample-image-23.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Canongate Books',
         publishDate: new Date('2023-03-10'),
         isbn: '978-1-78689-273-23',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-4',
         title: 'Educated',
         author: 'Tara Westover',
         narrator: 'Julia Whelan',
         description: 'A memoir about a woman who grows up in a survivalist Mormon family.',
         duration: 39600, // 11 hours
         fileSize: BigInt(130000000), // 130MB

         coverImage: '/uploads/images/sample-image-24.jpg',
         genre: 'Novel',
         language: 'en',
         publisher: 'Random House Audio',
         publishDate: new Date('2023-04-05'),
         isbn: '978-0-399-59050-24',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-5',
         title: 'The Silent Patient',
         author: 'Alex Michaelides',
         narrator: 'Jack Hawkins',
         description: 'A psychological thriller about a woman who refuses to speak after allegedly murdering her husband.',
         duration: 36000, // 10 hours
         fileSize: BigInt(115000000), // 115MB

         coverImage: '/uploads/images/sample-image-25.jpg',
         genre: 'Thriller',
         language: 'en',
         publisher: 'Macmillan Audio',
         publishDate: new Date('2023-05-12'),
         isbn: '978-1-250-30169-25',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-6',
         title: 'Becoming',
         author: 'Michelle Obama',
         narrator: 'Michelle Obama',
         description: 'An intimate memoir by the former First Lady of the United States.',
         duration: 72000, // 20 hours
         fileSize: BigInt(240000000), // 240MB

         coverImage: '/uploads/images/sample-image-26.jpg',
         genre: 'Novel',
         language: 'en',
         publisher: 'Random House Audio',
         publishDate: new Date('2023-06-18'),
         isbn: '978-1-5247-6313-26',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-7',
         title: 'The Psychology of Money',
         author: 'Morgan Housel',
         narrator: 'Chris Hill',
         description: 'Timeless lessons on wealth, greed, and happiness.',
         duration: 25200, // 7 hours
         fileSize: BigInt(85000000), // 85MB

         coverImage: '/uploads/images/sample-image-27.jpg',
         genre: 'Philosophy',
         language: 'en',
         publisher: 'Harriman House',
         publishDate: new Date('2023-07-25'),
         isbn: '978-0-85719-768-27',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-8',
         title: 'Project Hail Mary',
         author: 'Andy Weir',
         narrator: 'Ray Porter',
         description: 'A lone astronaut must save the earth from disaster in this science fiction thriller.',
         duration: 50400, // 14 hours
         fileSize: BigInt(170000000), // 170MB

         coverImage: '/uploads/images/sample-image-28.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'Audible Studios',
         publishDate: new Date('2023-08-30'),
         isbn: '978-0-593-35737-28',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-9',
         title: 'The Four Agreements',
         author: 'Don Miguel Ruiz',
         narrator: 'Peter Coyote',
         description: 'A practical guide to personal freedom based on ancient Toltec wisdom.',
         duration: 18000, // 5 hours
         fileSize: BigInt(60000000), // 60MB

         coverImage: '/uploads/images/sample-image-29.jpg',
         genre: 'Religious',
         language: 'en',
         publisher: 'Amber-Allen Publishing',
         publishDate: new Date('2023-09-14'),
         isbn: '978-1-878424-31-29',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      },
      {
         id: 'trending-10',
         title: 'The Alchemist',
         author: 'Paulo Coelho',
         narrator: 'Jeremy Irons',
         description: 'A magical fable about following your dreams and listening to your heart.',
         duration: 21600, // 6 hours
         fileSize: BigInt(75000000), // 75MB

         coverImage: '/uploads/images/sample-image-30.jpg',
         genre: 'Fiction',
         language: 'en',
         publisher: 'HarperAudio',
         publishDate: new Date('2023-10-22'),
         isbn: '978-0-06-112241-30',
         isActive: true,
         isPublic: true,
         tags: ['Trending']
      }
   ];

   // Create all audiobooks
   // Create a mapping of genre names to genre IDs
   const genreMap = new Map();
   createdGenres.forEach(genre => {
      genreMap.set(genre.name, genre.id);
   });

   const createdAudiobooks: Array<{ audiobook: any; tags: string[] }> = [];
   for (const bookData of audiobookData) {
      const { tags, genre, ...bookInfo } = bookData;

      // Map genre string to genreId
      const genreId = genre ? genreMap.get(genre) : null;

      const audiobook = await prisma.audioBook.upsert({
         where: { id: bookData.id },
         update: {},
         create: {
            ...bookInfo,
            genreId
         }
      });

      createdAudiobooks.push({ audiobook, tags });
   }

   console.log('✅ Created 30 audiobooks');

   // Create tag relationships
   for (const { audiobook, tags } of createdAudiobooks) {
      for (const tagName of tags) {
         const tag = tagName === 'Trending' ? trendingTag : newReleasesTag;

         await prisma.audioBookTag.upsert({
            where: {
               audiobookId_tagId: {
                  audiobookId: audiobook.id,
                  tagId: tag.id
               }
            },
            update: {},
            create: {
               audiobookId: audiobook.id,
               tagId: tag.id
            }
         });
      }
   }

   console.log('✅ Created tag relationships');

   // Create user-audiobook relationships for some books
   const sampleBooks = createdAudiobooks.slice(0, 5);
   for (const { audiobook } of sampleBooks) {
      await prisma.userAudioBook.upsert({
         where: {
            userProfileId_audiobookId: {
               userProfileId: userProfile.id,
               audiobookId: audiobook.id
            }
         },
         update: {},
         create: {
            userProfileId: userProfile.id,
            audiobookId: audiobook.id,
            type: 'OWNED'
         }
      });
   }

   console.log('✅ Created user-audiobook relationships');

   // Create a sample playlist
   const playlist = await prisma.playlist.create({
      data: {
         name: 'My Favorites',
         description: 'A collection of my favorite audiobooks',
         isPublic: false,
         userProfileId: userProfile.id,
         items: {
            create: sampleBooks.map(({ audiobook }, index) => ({
               audiobookId: audiobook.id,
               position: index + 1
            }))
         }
      }
   });

   console.log('✅ Created sample playlist:', playlist.name);

   // Create sample reviews
   for (let i = 0; i < 3; i++) {
      if (sampleBooks[i]) {
         await prisma.review.create({
            data: {
               userProfileId: userProfile.id,
               audiobookId: sampleBooks[i]!.audiobook.id,
               rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
               title: `Great audiobook ${i + 1}!`,
               content: `This was an amazing listening experience. The narration was excellent and the story kept me engaged throughout.`
            }
         });
      }
   }

   console.log('✅ Created sample reviews');

   // Create listening history
   for (let i = 0; i < 3; i++) {
      if (sampleBooks[i]) {
         await prisma.listeningHistory.create({
            data: {
               userProfileId: userProfile.id,
               audiobookId: sampleBooks[i]!.audiobook.id,
               currentPosition: Math.floor(Math.random() * 3600) + 1800, // 30min to 1.5 hours
               completed: Math.random() > 0.7,
               lastListenedAt: new Date()
            }
         });
      }
   }

   console.log('✅ Created listening history');

   console.log('🎉 Database seeding completed successfully!');
   console.log(`📚 Created ${createdAudiobooks.length} audiobooks`);
   console.log(`🏷️  Tagged 10 books with "Trending"`);
   console.log(`🏷️  Tagged 20 books with "New Releases"`);
}

main()
   .catch((e) => {
      console.error('❌ Error during seeding:', e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });