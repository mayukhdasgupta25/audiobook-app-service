/**
 * Username Generator Utility
 * Generates unique hyphenated usernames with random words and numbers
 */
import { PrismaClient } from '@prisma/client';
import { UsernameGenerationOptions, UsernameGenerationResult } from '../types/user-events';

export class UsernameGenerator {
   private prisma: PrismaClient;

   // Word lists for username generation
   private adjectives = [
      'happy', 'bright', 'swift', 'clever', 'brave', 'calm', 'cool', 'wild',
      'gentle', 'strong', 'wise', 'bold', 'kind', 'free', 'pure', 'true',
      'quick', 'sharp', 'smooth', 'solid', 'fresh', 'clear', 'deep', 'high'
   ];

   private nouns = [
      'tiger', 'eagle', 'wolf', 'bear', 'fox', 'lion', 'deer', 'hawk',
      'falcon', 'raven', 'owl', 'dove', 'swan', 'fish', 'star', 'moon',
      'river', 'mountain', 'forest', 'ocean', 'storm', 'wind', 'fire', 'ice'
   ];

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Generate a unique username
    */
   async generateUniqueUsername(options: UsernameGenerationOptions = {}): Promise<UsernameGenerationResult> {
      const {
         wordCount = 2,
         numberCount = 4,
         maxRetries = 10
      } = options;

      let attempts = 0;

      while (attempts < maxRetries) {
         attempts++;

         try {
            const username = this.generateUsername(wordCount, numberCount);
            const isUnique = await this.isUsernameUnique(username);

            if (isUnique) {
               return {
                  username,
                  attempts
               };
            }
         } catch (_error) {
            // console.error(`Error checking username uniqueness (attempt ${attempts}):`, _error);
         }
      }

      throw new Error(`Failed to generate unique username after ${maxRetries} attempts`);
   }

   /**
    * Generate a single username
    */
   private generateUsername(wordCount: number, numberCount: number): string {
      const words: string[] = [];

      // Add random adjectives
      for (let i = 0; i < Math.ceil(wordCount / 2); i++) {
         const randomAdjective = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
         if (randomAdjective) {
            words.push(randomAdjective);
         }
      }

      // Add random nouns
      for (let i = 0; i < Math.floor(wordCount / 2); i++) {
         const randomNoun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
         if (randomNoun) {
            words.push(randomNoun);
         }
      }

      // Generate random numbers
      const numbers = this.generateRandomNumbers(numberCount);

      // Combine words and numbers with hyphens
      return [...words, numbers].join('-');
   }

   /**
    * Generate random numbers as string
    */
   private generateRandomNumbers(count: number): string {
      let numbers = '';
      for (let i = 0; i < count; i++) {
         numbers += Math.floor(Math.random() * 10).toString();
      }
      return numbers;
   }

   /**
    * Check if username is unique in database
    */
   private async isUsernameUnique(username: string): Promise<boolean> {
      try {
         const existingUser = await this.prisma.userProfile.findUnique({
            where: { username },
            select: { id: true }
         });

         return !existingUser;
      } catch (error) {
         // console.error('Error checking username uniqueness:', error);
         throw error;
      }
   }

   /**
    * Validate username format
    */
   static isValidUsername(username: string): boolean {
      // Username should be lowercase, contain only letters, numbers, and hyphens
      // Should not start or end with hyphen
      const usernameRegex = /^[a-z]+(-[a-z0-9]+)*$/;
      return usernameRegex.test(username) && username.length >= 3 && username.length <= 50;
   }
}
