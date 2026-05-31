import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_MOODS = [
   {
      name: 'Happy',
      icon: 'sun',
      hexcode: '#FFC83D',
      description: 'Uplifting stories filled with joy, warmth, and feel-good moments.',
      purpose:
         'Happy is designed for lifting your spirits and surrounding yourself with positivity. These audiobooks are curated to spark joy, lighten your mood, and remind you that good things happen — perfect for starting your day, recovering from a tough moment, or simply enjoying life with a smile.',
   },
   {
      name: 'Romantic',
      icon: 'heart',
      hexcode: '#E91E63',
      description: 'Tender tales of love, passion, and heartfelt connections.',
      purpose:
         'Romantic is designed for moments of love, intimacy, and emotional connection. These stories help you feel seen and understood, whether you are celebrating a relationship, dreaming of one, or simply savoring the beauty of human affection and devotion.',
   },
   {
      name: 'Emotional',
      icon: 'droplet',
      hexcode: '#5B8DEF',
      description: 'Deep, moving narratives that stir strong feelings and reflection.',
      purpose:
         'Emotional is designed for listeners who want stories that reach deep and let them feel fully. These audiobooks create space for catharsis, empathy, and self-reflection — helping you process your own feelings, connect with characters on a human level, and experience the power of a story that stays with you.',
   },
   {
      name: 'Suspenseful',
      icon: 'eye',
      hexcode: '#6A4C93',
      description: 'Tension-filled stories that keep you on the edge of your seat.',
      purpose:
         'Suspenseful is designed for those who crave tension, mystery, and the thrill of not knowing what comes next. These audiobooks keep your mind engaged and your heart racing — ideal for commutes, late-night listening, or anytime you want a gripping experience that pulls you in and refuses to let go.',
   },
   {
      name: 'Scary',
      icon: 'ghost',
      hexcode: '#8E44AD',
      description: 'Chilling horror and supernatural tales designed to unsettle and thrill.',
      purpose:
         'Scary is designed for a rush of adrenaline and the delicious chill of the unknown. These horror and supernatural stories help you escape the ordinary, confront fear in a safe space, and experience the excitement of stories that haunt, unsettle, and thrill long after you stop listening.',
   },
   {
      name: 'Funny',
      icon: 'laugh',
      hexcode: '#FFB703',
      description: 'Lighthearted and humorous stories meant to entertain and amuse.',
      purpose:
         'Funny is designed for when you need a laugh and a break from seriousness. These lighthearted audiobooks entertain, reduce stress, and brighten your day — whether you are unwinding after work, sharing a chuckle with family, or simply wanting stories that do not take themselves too seriously.',
   },
   {
      name: 'Calm',
      icon: 'wave',
      hexcode: '#38BDF8',
      description: 'Peaceful, soothing audiobooks perfect for relaxation and unwinding.',
      purpose:
         'Calm is designed for slowing down, breathing deeply, and finding peace. These soothing audiobooks help reduce anxiety, prepare you for restful sleep, and create a gentle backdrop for meditation, yoga, or quiet moments — giving your mind a quiet place to land.',
   },
   {
      name: 'Inspirational',
      icon: 'sparkle',
      hexcode: '#00B894',
      description: 'Motivating stories of growth, resilience, and positive transformation.',
      purpose:
         'Inspirational is designed for motivation, hope, and a push toward your best self. These stories of growth, resilience, and triumph help you believe in possibility, learn from others who overcame obstacles, and feel energized to take on your own challenges with renewed confidence.',
   },
   {
      name: 'Dark',
      icon: 'moon',
      hexcode: '#121212',
      description: 'Grim, brooding narratives exploring shadowy themes and moral complexity.',
      purpose:
         'Dark is designed for listeners drawn to complex, shadowy narratives and moral ambiguity. These brooding stories explore the harder sides of life — helping you engage with difficult themes, question assumptions, and experience fiction that is rich, layered, and unafraid to look at what lies beneath the surface.',
   },
   {
      name: 'Nostalgic',
      icon: 'videotape',
      hexcode: '#C17C3A',
      description: 'Stories that evoke memories of the past and a longing for simpler times.',
      purpose:
         'Nostalgic is designed for revisiting the past and feeling connected to simpler times. These stories evoke warm memories, cultural touchstones, and a gentle longing for what was — helping you reflect on your own journey, share memories with loved ones, and find comfort in tales rooted in tradition and remembrance.',
   },
] as const;

const DEFAULT_AUDIOBOOK_MOOD = 'Suspenseful';

async function main() {
   console.log('Seeding moods...');

   for (const mood of DEFAULT_MOODS) {
      const created = await prisma.mood.upsert({
         where: { name: mood.name },
         update: {
            icon: mood.icon,
            hexcode: mood.hexcode,
            description: mood.description,
            purpose: mood.purpose,
         },
         create: {
            name: mood.name,
            icon: mood.icon,
            descriptionIcon: '',
            hexcode: mood.hexcode,
            description: mood.description,
            purpose: mood.purpose,
         },
      });

      console.log(`  ${created.name} (${created.icon}, ${created.hexcode})`);
   }

   const suspensefulMood = await prisma.mood.findUnique({
      where: { name: DEFAULT_AUDIOBOOK_MOOD },
   });

   if (!suspensefulMood) {
      throw new Error(`Mood "${DEFAULT_AUDIOBOOK_MOOD}" was not found after seeding`);
   }

   const updateResult = await prisma.audioBook.updateMany({
      data: { moodId: suspensefulMood.id },
   });

   console.log(`Assigned "${DEFAULT_AUDIOBOOK_MOOD}" mood to ${updateResult.count} audiobook(s)`);
   console.log('Mood seeding completed.');
}

main()
   .catch((error) => {
      console.error('Mood seeding failed:', error);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
