import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DESC_ICONS_DIR = path.join(__dirname, '..', 'desc_icons');
const MOOD_ATTRIBUTES_DIR = path.join(__dirname, '..', 'mood_attributes');
const EXPECTED_MOOD_COUNT = 10;
const EXPECTED_ATTRIBUTES_PER_MOOD = 3;

/** Natural one-liners for icons where the default template reads awkwardly */
const ATTRIBUTE_DESCRIPTION_OVERRIDES: Record<string, string> = {
   cheerful: 'Bright and cheerful stories that lift the spirit.',
   'feel-good': 'Feel-good narratives that leave you smiling.',
   uplifting: 'Uplifting tales that inspire positivity.',
   passionate: 'Passionate stories filled with deep emotion and desire.',
   soft: 'Soft, tender moments of warmth and affection.',
   loving: 'Loving narratives that celebrate connection and care.',
   deep: 'Deep, introspective stories that resonate on a personal level.',
   heartfelt: 'Heartfelt narratives that touch the soul.',
   moving: 'Moving tales that stay with you long after listening.',
   tense: 'Tense storytelling that keeps you on edge.',
   gripping: 'Gripping plots that are hard to put down.',
   mysterious: 'Mysterious narratives full of intrigue and unanswered questions.',
   chilling: 'Chilling tales that send shivers down your spine.',
   fearful: 'Fearful atmospheres that unsettle and thrill.',
   haunted: 'Haunted stories steeped in dread and the supernatural.',
   witty: 'Witty humor that delivers clever laughs.',
   playful: 'Playful storytelling with a light, fun tone.',
   light: 'Light-hearted narratives perfect for easy listening.',
   relaxing: 'Relaxing stories ideal for winding down.',
   mindful: 'Mindful listening that encourages peace and presence.',
   hopeful: 'Hopeful stories that shine a light on better days.',
   empowering: 'Empowering narratives that build confidence and courage.',
   motivating: 'Motivating tales that push you to reach higher.',
   brooding: 'Brooding narratives with a heavy, shadowy atmosphere.',
   intense: 'Intense storytelling that explores the darker side of human nature.',
   warm: 'Warm stories that feel like a comforting trip down memory lane.',
   retro: 'Retro vibes that evoke a bygone era.',
   'memory-filled': 'Memory-filled narratives rich with sentiment and reflection.',
};

function getSvgStem(filename: string): string {
   return path.basename(filename, path.extname(filename));
}

function toReadableLabel(iconStem: string): string {
   return iconStem
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-');
}

function generateAttributeDescription(iconStem: string): string {
   const override = ATTRIBUTE_DESCRIPTION_OVERRIDES[iconStem];
   if (override) {
      return override;
   }

   const label = toReadableLabel(iconStem);
   return `${label} stories that capture this mood's character.`;
}

function readSvgStemsFromDir(dirPath: string): string[] {
   if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
   }

   return fs
      .readdirSync(dirPath)
      .filter(file => file.toLowerCase().endsWith('.svg'))
      .map(getSvgStem)
      .sort((a, b) => a.localeCompare(b));
}

function readDescIconStems(): Map<string, string> {
   const stems = readSvgStemsFromDir(DESC_ICONS_DIR);
   const stemByLowercaseName = new Map<string, string>();

   for (const stem of stems) {
      stemByLowercaseName.set(stem.toLowerCase(), stem);
   }

   return stemByLowercaseName;
}

function readMoodAttributeStems(): Map<string, string[]> {
   if (!fs.existsSync(MOOD_ATTRIBUTES_DIR)) {
      throw new Error(`Directory not found: ${MOOD_ATTRIBUTES_DIR}`);
   }

   const moodFolders = fs
      .readdirSync(MOOD_ATTRIBUTES_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));

   const attributesByMood = new Map<string, string[]>();

   for (const folderName of moodFolders) {
      const folderPath = path.join(MOOD_ATTRIBUTES_DIR, folderName);
      const stems = readSvgStemsFromDir(folderPath);

      if (stems.length !== EXPECTED_ATTRIBUTES_PER_MOOD) {
         throw new Error(
            `Expected ${EXPECTED_ATTRIBUTES_PER_MOOD} SVG files in ${folderPath}, found ${stems.length}`
         );
      }

      attributesByMood.set(folderName, stems);
   }

   return attributesByMood;
}

async function main() {
   console.log('Seeding mood assets from local folders...');

   const moods = await prisma.mood.findMany({ orderBy: { name: 'asc' } });
   if (moods.length !== EXPECTED_MOOD_COUNT) {
      throw new Error(
         `Expected ${EXPECTED_MOOD_COUNT} moods in the database, found ${moods.length}. Run "npm run db:seed-moods" first.`
      );
   }

   const descIconStems = readDescIconStems();
   const attributeStemsByMood = readMoodAttributeStems();

   if (descIconStems.size !== EXPECTED_MOOD_COUNT) {
      throw new Error(
         `Expected ${EXPECTED_MOOD_COUNT} SVG files in desc_icons/, found ${descIconStems.size}`
      );
   }

   if (attributeStemsByMood.size !== EXPECTED_MOOD_COUNT) {
      throw new Error(
         `Expected ${EXPECTED_MOOD_COUNT} mood subfolders in mood_attributes/, found ${attributeStemsByMood.size}`
      );
   }

   const moodByName = new Map(moods.map(mood => [mood.name, mood]));
   const matchedDescIcons = new Set<string>();

   for (const mood of moods) {
      const descIconStem = descIconStems.get(mood.name.toLowerCase());
      if (!descIconStem) {
         throw new Error(`No desc_icons file found for mood "${mood.name}"`);
      }

      matchedDescIcons.add(mood.name.toLowerCase());

      const attributeStems = attributeStemsByMood.get(mood.name);
      if (!attributeStems) {
         throw new Error(`No mood_attributes subfolder found for mood "${mood.name}"`);
      }

      await prisma.mood.update({
         where: { id: mood.id },
         data: { descriptionIcon: descIconStem },
      });

      await prisma.moodAttribute.deleteMany({ where: { moodId: mood.id } });
      await prisma.moodAttribute.createMany({
         data: attributeStems.map(iconStem => ({
            moodId: mood.id,
            icon: iconStem,
            description: generateAttributeDescription(iconStem),
         })),
      });

      console.log(`  ${mood.name} → description_icon: ${descIconStem}, ${attributeStems.length} attributes`);
   }

   for (const [stemLower] of descIconStems) {
      if (!matchedDescIcons.has(stemLower)) {
         throw new Error(`desc_icons file "${stemLower}.svg" has no matching mood in the database`);
      }
   }

   for (const [folderName] of attributeStemsByMood) {
      if (!moodByName.has(folderName)) {
         throw new Error(`mood_attributes folder "${folderName}" has no matching mood in the database`);
      }
   }

   console.log('Mood asset seeding completed.');
}

main()
   .catch((error) => {
      console.error('Mood asset seeding failed:', error);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
