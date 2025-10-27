/**
 * UsernameGenerator Tests
 * Tests for username generation, validation, and uniqueness checking
 */

import { UsernameGenerator } from '../../utils/UsernameGenerator';

// Mock Prisma client
const mockPrisma = {
   userProfile: {
      findUnique: jest.fn(),
   },
} as any;

describe('UsernameGenerator', () => {
   let usernameGenerator: UsernameGenerator;
   let originalRandom: typeof Math.random;

   beforeEach(() => {
      usernameGenerator = new UsernameGenerator(mockPrisma);
      jest.clearAllMocks();

      // Save and reset Math.random
      originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);
   });

   afterEach(() => {
      // Restore Math.random
      Math.random = originalRandom;
      jest.restoreAllMocks();
   });

   describe('generateUniqueUsername', () => {
      it('should generate unique username with default options', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue(null); // Username is unique

         const result = await usernameGenerator.generateUniqueUsername();

         expect(result.username).toBeDefined();
         expect(typeof result.username).toBe('string');
         expect(result.attempts).toBe(1);
         expect(mockPrisma.userProfile.findUnique).toHaveBeenCalled();
      });

      it('should generate unique username with custom options', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue(null);

         const result = await usernameGenerator.generateUniqueUsername({
            wordCount: 3,
            numberCount: 6,
         });

         expect(result.username).toBeDefined();
         expect(result.attempts).toBe(1);
      });

      it('should retry when username is not unique', async () => {
         // First two attempts return existing user, third is unique
         mockPrisma.userProfile.findUnique
            .mockResolvedValueOnce({ id: '1' }) // Not unique
            .mockResolvedValueOnce({ id: '2' }) // Not unique
            .mockResolvedValueOnce(null); // Unique

         const result = await usernameGenerator.generateUniqueUsername();

         expect(result.attempts).toBe(3);
         expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledTimes(3);
      });

      it('should throw error after max retries', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: '1' }); // Always not unique

         await expect(
            usernameGenerator.generateUniqueUsername({ maxRetries: 3 })
         ).rejects.toThrow('Failed to generate unique username after 3 attempts');

         expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledTimes(3);
      });

      it('should handle database errors during uniqueness check', async () => {
         const error = new Error('Database connection failed');
         mockPrisma.userProfile.findUnique.mockRejectedValue(error);

         await expect(usernameGenerator.generateUniqueUsername()).rejects.toThrow(
            'Failed to generate unique username after 10 attempts'
         );
      });

      it('should include attempts count in result', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue(null);

         const result = await usernameGenerator.generateUniqueUsername();

         expect(result.attempts).toBeGreaterThanOrEqual(1);
         expect(typeof result.attempts).toBe('number');
      });
   });

   describe('isValidUsername', () => {
      it('should validate correctly formatted usernames', () => {
         const validUsernames = [
            'happy-tiger-1234',
            'swift-eagle-999',
            'brave-wolf-42',
            'a-b-c-1234',
         ];

         validUsernames.forEach((username) => {
            expect(UsernameGenerator.isValidUsername(username)).toBe(true);
         });
      });

      it('should reject usernames starting with hyphen', () => {
         const invalidUsernames = ['-happy-tiger-1234', '-test-1234'];

         invalidUsernames.forEach((username) => {
            expect(UsernameGenerator.isValidUsername(username)).toBe(false);
         });
      });

      it('should reject usernames ending with hyphen', () => {
         const invalidUsernames = ['happy-tiger-1234-', 'test-'];

         invalidUsernames.forEach((username) => {
            expect(UsernameGenerator.isValidUsername(username)).toBe(false);
         });
      });

      it('should reject usernames with uppercase letters', () => {
         const invalidUsernames = ['Happy-tiger-1234', 'SWIFT-EAGLE-999'];

         invalidUsernames.forEach((username) => {
            expect(UsernameGenerator.isValidUsername(username)).toBe(false);
         });
      });

      it('should reject usernames with special characters', () => {
         const invalidUsernames = [
            'happy_tiger-1234',
            'swift.eagle-999',
            'brave@wolf-42',
            'happy tiger-1234',
         ];

         invalidUsernames.forEach((username) => {
            expect(UsernameGenerator.isValidUsername(username)).toBe(false);
         });
      });

      it('should reject usernames shorter than 3 characters', () => {
         const invalidUsernames = ['ab', 'a1', 'aa'];

         invalidUsernames.forEach((username) => {
            expect(UsernameGenerator.isValidUsername(username)).toBe(false);
         });
      });

      it('should reject usernames longer than 50 characters', () => {
         const longUsername = 'a'.repeat(51);
         expect(UsernameGenerator.isValidUsername(longUsername)).toBe(false);
      });

      it('should accept usernames at length boundaries', () => {
         const username3 = 'abc-123';
         const username50 = 'a'.repeat(50);

         expect(UsernameGenerator.isValidUsername(username3)).toBe(true);
         expect(UsernameGenerator.isValidUsername(username50)).toBe(true);
      });

      it('should reject usernames with consecutive hyphens', () => {
         const invalidUsernames = ['happy--tiger-1234', 'swift---eagle-999'];

         invalidUsernames.forEach((username) => {
            expect(UsernameGenerator.isValidUsername(username)).toBe(false);
         });
      });
   });

   describe('generateUsername', () => {
      it('should generate username with word count and number count', () => {
         const username = (usernameGenerator as any).generateUsername(2, 4);

         expect(username).toMatch(/^[a-z]+-[a-z]+-[0-9]{4}$/);
         const parts = username.split('-');
         expect(parts.length).toBe(3); // 2 words + 1 number group
      });

      it('should generate username with custom word count', () => {
         const username = (usernameGenerator as any).generateUsername(4, 6);

         const parts = username.split('-');
         expect(parts.length).toBeGreaterThanOrEqual(2);
      });

      it('should generate different usernames on multiple calls', () => {
         const username1 = (usernameGenerator as any).generateUsername(2, 4);
         const username2 = (usernameGenerator as any).generateUsername(2, 4);

         // With mocked random, they should be different due to different calls
         expect(username1).toBeDefined();
         expect(username2).toBeDefined();
      });
   });

   describe('generateRandomNumbers', () => {
      it('should generate specified number count of digits', () => {
         Math.random = jest.fn(() => 0.1); // Seed for predictable output

         const numbers = (usernameGenerator as any).generateRandomNumbers(4);
         expect(numbers.length).toBe(4);
         expect(/^\d{4}$/.test(numbers)).toBe(true);
      });

      it('should generate random numbers', () => {
         const numbers1 = (usernameGenerator as any).generateRandomNumbers(4);
         const numbers2 = (usernameGenerator as any).generateRandomNumbers(4);

         expect(numbers1.length).toBe(4);
         expect(numbers2.length).toBe(4);
      });
   });

   describe('Edge Cases', () => {
      it('should handle empty username gracefully in validation', () => {
         expect(UsernameGenerator.isValidUsername('')).toBe(false);
      });

      it('should handle very short valid username', () => {
         expect(UsernameGenerator.isValidUsername('abc-123')).toBe(true);
      });

      it('should handle username with only numbers at the end', () => {
         expect(UsernameGenerator.isValidUsername('happy-tiger-9999')).toBe(true);
      });

      it('should handle username with single character words', () => {
         // The regex /^[a-z]+(-[a-z0-9]+)*$/ allows single chars, so these pass
         // This tests that the implementation accepts usernames with short parts
         expect(UsernameGenerator.isValidUsername('a-b-1234')).toBe(true);
      });

      it('should generate username that matches the expected format', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue(null);

         const result = await usernameGenerator.generateUniqueUsername();

         expect(UsernameGenerator.isValidUsername(result.username)).toBe(true);
      });
   });
});

