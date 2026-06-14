/**
 * MoodDto Tests
 */
import { MoodDto, MoodDetailDto, toMoodDto, toMoodAttributeDto, isValidHexcode } from '../../models/MoodDto';
import { Mood as PrismaMood, MoodAttribute as PrismaMoodAttribute } from '@prisma/client';

describe('MoodDto', () => {
   const createMockPrismaMoodAttribute = (overrides = {}): PrismaMoodAttribute => ({
      id: 'attribute-id',
      moodId: 'mood-id',
      icon: 'sparkle',
      description: 'Uplifting tone',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      ...overrides,
   });

   const createMockPrismaMood = (overrides = {}): PrismaMood & { moodAttributes?: PrismaMoodAttribute[] } => ({
      id: 'mood-id',
      name: 'Calm',
      description: 'Relaxing atmosphere',
      purpose: 'Calm is designed for slowing down, breathing deeply, and finding peace.',
      descriptionIcon: 'text',
      hexcode: '#AABBCC',
      icon: 'wave',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      moodAttributes: [],
      ...overrides,
   });

   describe('toMoodAttributeDto', () => {
      it('should convert Prisma MoodAttribute to DTO', () => {
         const attribute = createMockPrismaMoodAttribute();
         const result = toMoodAttributeDto(attribute);

         expect(result.id).toBe(attribute.id);
         expect(result.moodId).toBe(attribute.moodId);
         expect(result.icon).toBe(attribute.icon);
         expect(result.description).toBe(attribute.description);
      });
   });

   describe('toMoodDto', () => {
      it('should convert Prisma Mood to summary DTO without attributes by default', () => {
         const prismaMood = createMockPrismaMood();
         const result = toMoodDto(prismaMood);

         expect(result.id).toBe(prismaMood.id);
         expect(result.name).toBe(prismaMood.name);
         expect(result.description).toBe(prismaMood.description);
         expect(result.descriptionIcon).toBe(prismaMood.descriptionIcon);
         expect(result.hexcode).toBe(prismaMood.hexcode);
         expect(result.icon).toBe(prismaMood.icon);
         expect(result).not.toHaveProperty('attributes');
         expect(result).not.toHaveProperty('purpose');
         expect(result.createdAt).toEqual(prismaMood.createdAt);
         expect(result.updatedAt).toEqual(prismaMood.updatedAt);
      });

      it('should include mood attributes and purpose when detail is requested', () => {
         const attribute = createMockPrismaMoodAttribute();
         const prismaMood = createMockPrismaMood({ moodAttributes: [attribute] });
         const result = toMoodDto(prismaMood, true) as MoodDetailDto;

         expect(result.purpose).toBe('Calm is designed for slowing down, breathing deeply, and finding peace.');
         expect(result.attributes).toHaveLength(1);
         expect(result.attributes[0]?.icon).toBe('sparkle');
      });

      it('should handle null description', () => {
         const prismaMood = createMockPrismaMood({ description: null });
         const result = toMoodDto(prismaMood);
         expect(result.description).toBeNull();
      });
   });

   describe('isValidHexcode', () => {
      it('accepts 6-digit hex colors', () => {
         expect(isValidHexcode('#FF5733')).toBe(true);
         expect(isValidHexcode('#aabbcc')).toBe(true);
      });

      it('accepts 3-digit hex colors', () => {
         expect(isValidHexcode('#F53')).toBe(true);
      });

      it('rejects invalid hex colors', () => {
         expect(isValidHexcode('FF5733')).toBe(false);
         expect(isValidHexcode('#GGGGGG')).toBe(false);
         expect(isValidHexcode('#12345')).toBe(false);
      });
   });

   describe('MoodDto structure', () => {
      it('should have all required fields', () => {
         const mood: MoodDto = {
            id: 'mood-id',
            name: 'Energetic',
            description: null,
            purpose: 'Energetic is designed for an uplifting boost.',
            descriptionIcon: 'text',
            hexcode: '#123456',
            icon: 'sun',
            attributes: [],
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         const detail: MoodDetailDto = {
            ...mood,
            audiobooks: [],
         };

         expect(mood).toHaveProperty('id');
         expect(mood).toHaveProperty('name');
         expect(mood).toHaveProperty('description');
         expect(mood).toHaveProperty('purpose');
         expect(mood).toHaveProperty('descriptionIcon');
         expect(mood).toHaveProperty('hexcode');
         expect(mood).toHaveProperty('icon');
         expect(mood).toHaveProperty('attributes');
         expect(mood).toHaveProperty('createdAt');
         expect(mood).toHaveProperty('updatedAt');
         expect(detail).toHaveProperty('audiobooks');
      });
   });
});
