import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';
import { RedisConnection } from '../config/redis';
import { RabbitMQFactory } from '../config/rabbitmq';

const prisma = new PrismaClient();

export type DependencyHealth = {
   database: boolean;
   redis: boolean;
   rabbitmq: boolean;
};

export async function getDependencyHealth(): Promise<DependencyHealth> {
   const [database, redis, rabbitmq] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkRabbitmqHealth(),
   ]);

   return { database, redis, rabbitmq };
}

export function isDependencyHealthOk(checks: DependencyHealth): boolean {
   return checks.database && checks.redis && checks.rabbitmq;
}

export async function getAppHealthStatus() {
   const checks = await getDependencyHealth();
   const healthy = isDependencyHealthOk(checks);

   return {
      status: healthy ? 'healthy' : 'unhealthy',
      service: 'app-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env['npm_package_version'] || '1.0.0',
      checks,
   };
}

async function checkDatabaseHealth(): Promise<boolean> {
   try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
   } catch {
      return false;
   }
}

async function checkRedisHealth(): Promise<boolean> {
   try {
      return await RedisConnection.getInstance().testConnection();
   } catch {
      return false;
   }
}

async function checkRabbitmqHealth(): Promise<boolean> {
   try {
      return RabbitMQFactory.getConnection().isConnected();
   } catch {
      return false;
   }
}
