/**
 * UserSubscription Service Layer
 * Handles business logic for managing user subscriptions:
 * subscribing, cancellation, renewal, and lifecycle queries.
 */
import {
   PrismaClient,
   Prisma,
   SubscriptionStatus,
   BillingInterval
} from '@prisma/client';
import {
   UserSubscriptionDto,
   UserSubscriptionWithPlan,
   CreateUserSubscriptionDto,
   UpdateUserSubscriptionDto,
   CancelSubscriptionDto,
   UserSubscriptionQueryParams,
   toUserSubscriptionDto,
   toUserSubscriptionWithPlan
} from '../models/UserSubscriptionDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

/** Add a number of months to a date, returning a new Date instance. */
function addMonths(date: Date, months: number): Date {
   const result = new Date(date.getTime());
   result.setMonth(result.getMonth() + months);
   return result;
}

/** Add a number of days to a date, returning a new Date instance. */
function addDays(date: Date, days: number): Date {
   const result = new Date(date.getTime());
   result.setDate(result.getDate() + days);
   return result;
}

/**
 * Compute the end of a billing period given a start date and an interval.
 * LIFETIME plans return a far-future date used as a sentinel value.
 */
export function computePeriodEnd(start: Date, interval: BillingInterval): Date {
   switch (interval) {
      case BillingInterval.MONTHLY:
         return addMonths(start, 1);
      case BillingInterval.QUARTERLY:
         return addMonths(start, 3);
      case BillingInterval.YEARLY:
         return addMonths(start, 12);
      case BillingInterval.LIFETIME:
         return new Date('9999-12-31T23:59:59.999Z');
      default:
         return addMonths(start, 1);
   }
}

export class UserSubscriptionService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Subscribe a user to a plan.
    * If the user already has an ACTIVE/TRIALING subscription, this is rejected with a conflict.
    */
   async createSubscription(data: CreateUserSubscriptionDto): Promise<UserSubscriptionWithPlan> {
      try {
         const userProfile = await this.prisma.userProfile.findUnique({
            where: { id: data.userProfileId }
         });
         if (!userProfile) {
            throw new ApiError(
               MessageHandler.getErrorMessage('not_found.user'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: data.planId }
         });
         if (!plan) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }
         if (!plan.isActive) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.inactive'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const activeExisting = await this.prisma.userSubscription.findFirst({
            where: {
               userProfileId: data.userProfileId,
               status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] }
            }
         });
         if (activeExisting) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.already_subscribed'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }

         const startDate = data.startDate ? new Date(data.startDate) : new Date();
         const useTrial = (data.startTrial ?? plan.trialDays > 0) && plan.trialDays > 0;
         const trialEndsAt = useTrial ? addDays(startDate, plan.trialDays) : null;
         const currentPeriodStart = startDate;
         const currentPeriodEnd = useTrial
            ? trialEndsAt!
            : computePeriodEnd(startDate, plan.billingInterval);
         const status = useTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE;

         const created = await this.prisma.userSubscription.create({
            data: {
               userProfileId: data.userProfileId,
               planId: data.planId,
               status,
               startDate,
               currentPeriodStart,
               currentPeriodEnd,
               trialEndsAt,
               autoRenew: data.autoRenew ?? plan.billingInterval !== BillingInterval.LIFETIME,
               paymentMethod: data.paymentMethod ?? null
            },
            include: { plan: true }
         });

         return toUserSubscriptionWithPlan(created);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.create_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * List subscriptions with pagination and optional filters.
    */
   async getAllSubscriptions(
      queryParams: UserSubscriptionQueryParams = {}
   ): Promise<{ subscriptions: UserSubscriptionWithPlan[]; totalCount: number }> {
      try {
         const page = queryParams.page || 1;
         const limit = queryParams.limit || 10;
         const skip = (page - 1) * limit;
         const sortBy = queryParams.sortBy || 'createdAt';
         const sortOrder = queryParams.sortOrder || 'desc';

         const where: Prisma.UserSubscriptionWhereInput = {};
         if (queryParams.userProfileId) where.userProfileId = queryParams.userProfileId;
         if (queryParams.planId) where.planId = queryParams.planId;
         if (queryParams.status) where.status = queryParams.status;

         const [totalCount, subscriptions] = await Promise.all([
            this.prisma.userSubscription.count({ where }),
            this.prisma.userSubscription.findMany({
               where,
               skip,
               take: limit,
               orderBy: { [sortBy]: sortOrder },
               include: { plan: true }
            })
         ]);

         return {
            subscriptions: subscriptions.map(toUserSubscriptionWithPlan),
            totalCount
         };
      } catch (_error) {
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get a subscription by id, including its plan.
    */
   async getSubscriptionById(id: string): Promise<UserSubscriptionWithPlan> {
      try {
         const sub = await this.prisma.userSubscription.findUnique({
            where: { id },
            include: { plan: true }
         });
         if (!sub) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }
         return toUserSubscriptionWithPlan(sub);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Find the user's currently active subscription, if any.
    * Returns null when the user has no active/trialing/past-due subscription.
    */
   async getActiveSubscriptionForUser(userProfileId: string): Promise<UserSubscriptionWithPlan | null> {
      try {
         const sub = await this.prisma.userSubscription.findFirst({
            where: {
               userProfileId,
               status: {
                  in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE]
               }
            },
            orderBy: { createdAt: 'desc' },
            include: { plan: true }
         });
         return sub ? toUserSubscriptionWithPlan(sub) : null;
      } catch (_error) {
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Update non-lifecycle fields on a subscription, e.g. payment method or auto-renew.
    */
   async updateSubscription(id: string, data: UpdateUserSubscriptionDto): Promise<UserSubscriptionDto> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         const updateData: Prisma.UserSubscriptionUpdateInput = {};
         if (data.autoRenew !== undefined) updateData.autoRenew = data.autoRenew;
         if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
         if (data.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
         if (data.status !== undefined) updateData.status = data.status;

         if (Object.keys(updateData).length === 0) {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.no_update_fields'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const updated = await this.prisma.userSubscription.update({
            where: { id },
            data: updateData
         });

         return toUserSubscriptionDto(updated);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.update_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Cancel a subscription. By default it is canceled at the end of the current
    * billing period, preserving access until then. Pass `cancelAtPeriodEnd=false`
    * to immediately set status to CANCELED.
    */
   async cancelSubscription(id: string, options: CancelSubscriptionDto = {}): Promise<UserSubscriptionDto> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         if (existing.status === SubscriptionStatus.CANCELED || existing.status === SubscriptionStatus.EXPIRED) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.already_canceled'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const cancelAtPeriodEnd = options.cancelAtPeriodEnd ?? true;
         const now = new Date();

         const updateData: Prisma.UserSubscriptionUpdateInput = {
            cancelAtPeriodEnd,
            canceledAt: now,
            autoRenew: false
         };

         if (!cancelAtPeriodEnd) {
            updateData.status = SubscriptionStatus.CANCELED;
            updateData.endDate = now;
         }

         const updated = await this.prisma.userSubscription.update({
            where: { id },
            data: updateData
         });

         return toUserSubscriptionDto(updated);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.cancel_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Renew a subscription for another billing period.
    * Trialing subscriptions become ACTIVE upon renewal.
    */
   async renewSubscription(id: string): Promise<UserSubscriptionDto> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({
            where: { id },
            include: { plan: true }
         });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         if (existing.plan.billingInterval === BillingInterval.LIFETIME) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.lifetime_no_renew'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         if (existing.status === SubscriptionStatus.CANCELED) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.cannot_renew_canceled'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const now = new Date();
         const newPeriodStart = existing.currentPeriodEnd > now ? existing.currentPeriodEnd : now;
         const newPeriodEnd = computePeriodEnd(newPeriodStart, existing.plan.billingInterval);

         const updated = await this.prisma.userSubscription.update({
            where: { id },
            data: {
               status: SubscriptionStatus.ACTIVE,
               currentPeriodStart: newPeriodStart,
               currentPeriodEnd: newPeriodEnd,
               cancelAtPeriodEnd: false,
               canceledAt: null,
               endDate: null
            }
         });

         return toUserSubscriptionDto(updated);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.renew_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Permanently delete a subscription record. Use with care; cancellation is
    * usually preferable so history is retained.
    */
   async deleteSubscription(id: string): Promise<boolean> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }
         await this.prisma.userSubscription.delete({ where: { id } });
         return true;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.delete_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get all subscriptions for a user (history view).
    */
   async getSubscriptionsByUserProfileId(
      userProfileId: string,
      queryParams: UserSubscriptionQueryParams = {}
   ): Promise<{ subscriptions: UserSubscriptionWithPlan[]; totalCount: number }> {
      return this.getAllSubscriptions({ ...queryParams, userProfileId });
   }
}
