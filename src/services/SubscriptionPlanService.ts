/**
 * SubscriptionPlan Service Layer
 * Handles business logic and database operations for subscription plans.
 */
import { PrismaClient, Prisma, BillingInterval } from '@prisma/client';
import {
   SubscriptionPlanDto,
   CreateSubscriptionPlanDto,
   UpdateSubscriptionPlanDto,
   SubscriptionPlanQueryParams,
   toSubscriptionPlanDto
} from '../models/SubscriptionPlanDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

export class SubscriptionPlanService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Create a new subscription plan.
    */
   async createPlan(data: CreateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
      const trimmedName = data.name.trim();
      try {
         const existing = await this.prisma.subscriptionPlan.findFirst({
            where: { name: { equals: trimmedName, mode: 'insensitive' } }
         });
         if (existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.name_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }

         if (data.price < 0) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.price_invalid'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const created = await this.prisma.subscriptionPlan.create({
            data: {
               name: trimmedName,
               description: data.description ?? null,
               price: new Prisma.Decimal(data.price),
               currency: data.currency ?? 'USD',
               billingInterval: data.billingInterval ?? BillingInterval.MONTHLY,
               trialDays: data.trialDays ?? 0,
               features: data.features ?? Prisma.JsonNull,
               isActive: data.isActive ?? true
            }
         });

         return toSubscriptionPlanDto(created);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('subscription_plans.create_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get all subscription plans with optional pagination & filtering.
    */
   async getAllPlans(
      queryParams: SubscriptionPlanQueryParams = {}
   ): Promise<{ plans: SubscriptionPlanDto[]; totalCount: number }> {
      try {
         const page = queryParams.page || 1;
         const limit = queryParams.limit || 10;
         const skip = (page - 1) * limit;
         const sortBy = queryParams.sortBy || 'createdAt';
         const sortOrder = queryParams.sortOrder || 'desc';

         const where: Prisma.SubscriptionPlanWhereInput = {};
         if (queryParams.isActive !== undefined) {
            where.isActive = queryParams.isActive;
         }
         if (queryParams.billingInterval) {
            where.billingInterval = queryParams.billingInterval;
         }
         if (queryParams.search) {
            where.OR = [
               { name: { contains: queryParams.search, mode: 'insensitive' } },
               { description: { contains: queryParams.search, mode: 'insensitive' } }
            ];
         }

         const [totalCount, plans] = await Promise.all([
            this.prisma.subscriptionPlan.count({ where }),
            this.prisma.subscriptionPlan.findMany({
               where,
               skip,
               take: limit,
               orderBy: { [sortBy]: sortOrder }
            })
         ]);

         return { plans: plans.map(toSubscriptionPlanDto), totalCount };
      } catch (_error) {
         throw new ApiError(
            MessageHandler.getErrorMessage('subscription_plans.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get a subscription plan by ID.
    */
   async getPlanById(id: string): Promise<SubscriptionPlanDto> {
      try {
         const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
         if (!plan) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }
         return toSubscriptionPlanDto(plan);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('subscription_plans.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Update an existing subscription plan.
    */
   async updatePlan(id: string, data: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
      try {
         const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         const updateData: Prisma.SubscriptionPlanUpdateInput = {};

         if (data.name !== undefined) {
            const trimmed = data.name.trim();
            const duplicate = await this.prisma.subscriptionPlan.findFirst({
               where: {
                  name: { equals: trimmed, mode: 'insensitive' },
                  NOT: { id }
               }
            });
            if (duplicate) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('subscription_plans.name_exists'),
                  HttpStatusCode.CONFLICT,
                  ErrorType.CONFLICT
               );
            }
            updateData.name = trimmed;
         }

         if (data.description !== undefined) updateData.description = data.description;
         if (data.price !== undefined) {
            if (data.price < 0) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('subscription_plans.price_invalid'),
                  HttpStatusCode.BAD_REQUEST,
                  ErrorType.VALIDATION_ERROR
               );
            }
            updateData.price = new Prisma.Decimal(data.price);
         }
         if (data.currency !== undefined) updateData.currency = data.currency;
         if (data.billingInterval !== undefined) updateData.billingInterval = data.billingInterval;
         if (data.trialDays !== undefined) updateData.trialDays = data.trialDays;
         if (data.features !== undefined) {
            updateData.features = data.features === null ? Prisma.JsonNull : data.features;
         }
         if (data.isActive !== undefined) updateData.isActive = data.isActive;

         const updated = await this.prisma.subscriptionPlan.update({
            where: { id },
            data: updateData
         });

         return toSubscriptionPlanDto(updated);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('subscription_plans.update_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Delete (or soft-deactivate) a subscription plan.
    * Plans referenced by user subscriptions are soft-deactivated to preserve history.
    */
   async deletePlan(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
      try {
         const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         const subscriptionsCount = await this.prisma.userSubscription.count({
            where: { planId: id }
         });

         if (subscriptionsCount > 0) {
            await this.prisma.subscriptionPlan.update({
               where: { id },
               data: { isActive: false }
            });
            return { deleted: false, deactivated: true };
         }

         await this.prisma.subscriptionPlan.delete({ where: { id } });
         return { deleted: true, deactivated: false };
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('subscription_plans.delete_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }
}
