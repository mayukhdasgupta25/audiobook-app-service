/**
 * Singleton BackgroundJobService for app-wide scheduled jobs (including subscription lifecycle).
 */
import { PrismaClient } from '@prisma/client';
import { BackgroundJobService } from '../services/BackgroundJobService';

let instance: BackgroundJobService | null = null;

export function getBackgroundJobService(prisma?: PrismaClient): BackgroundJobService {
   if (!instance) {
      instance = new BackgroundJobService(prisma ?? new PrismaClient());
   }
   return instance;
}
