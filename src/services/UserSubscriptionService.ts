/**
 * UserSubscription Service Layer
 * Handles business logic for managing user subscriptions:
 * subscribing, cancellation, renewal, plan changes, and lifecycle processing.
 */
import {
   PrismaClient,
   Prisma,
   SubscriptionStatus,
   BillingInterval,
   BillingEventType,
   PlanChangeType,
   SubscriptionPlan
} from '@prisma/client';
import {
   UserSubscriptionDto,
   UserSubscriptionWithPlan,
   CreateUserSubscriptionDto,
   UpdateUserSubscriptionDto,
   CancelSubscriptionDto,
   UserSubscriptionQueryParams,
   ChangePlanResultDto,
   toUserSubscriptionDto,
   toUserSubscriptionWithPlan,
   subscriptionInclude
} from '../models/UserSubscriptionDto';
import { toSubscriptionPlanDto } from '../models/SubscriptionPlanDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';
import {
   calculateProration,
   isUpgrade,
   isDowngrade,
   PlanPriceInfo,
   roundMoney
} from '../utils/subscriptionBilling';
import { attemptRenewalPayment } from './subscriptionPaymentStub';

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

function toPlanPriceInfo(plan: SubscriptionPlan): PlanPriceInfo {
   return {
      id: plan.id,
      price: plan.price,
      tierLevel: plan.tierLevel,
      billingInterval: plan.billingInterval,
      currency: plan.currency
   };
}

/** Clear scheduled plan-change fields (Prisma relation API). */
function clearPendingPlanUpdate(): Pick<
   Prisma.UserSubscriptionUpdateInput,
   'pendingPlanChangeAt' | 'pendingPlanChangeType' | 'pendingPlan'
> {
   return {
      pendingPlanChangeAt: null,
      pendingPlanChangeType: null,
      pendingPlan: { disconnect: true }
   };
}

export interface ProcessDueSubscriptionsResult {
   processed: number;
   renewed: number;
   expired: number;
   pastDueEntered: number;
   pastDueRetried: number;
}

export class UserSubscriptionService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   private async recordBillingEvent(
      userSubscriptionId: string,
      type: BillingEventType,
      amount: number,
      currency: string,
      metadata?: Prisma.InputJsonValue
   ): Promise<void> {
      await this.prisma.subscriptionBillingEvent.create({
         data: {
            userSubscriptionId,
            type,
            amount: roundMoney(amount),
            currency,
            metadata: metadata ?? Prisma.JsonNull
         }
      });
   }

   private assertPlanChangeAllowed(
      status: SubscriptionStatus,
      current: PlanPriceInfo,
      target: PlanPriceInfo
   ): void {
      if (status === SubscriptionStatus.PAST_DUE) {
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.payment_required_for_plan_change'),
            HttpStatusCode.PAYMENT_REQUIRED,
            ErrorType.FORBIDDEN
         );
      }

      if (status === SubscriptionStatus.TRIALING) {
         if (!isUpgrade(current, target)) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.cannot_change_plan_during_trial'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }
         return;
      }

      if (status !== SubscriptionStatus.ACTIVE) {
         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.plan_change_not_allowed'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }
   }

   /**
    * Change subscription plan: immediate upgrade with proration, or scheduled downgrade.
    */
   async changePlan(
      subscriptionId: string,
      newPlanId: string,
      userProfileId?: string
   ): Promise<ChangePlanResultDto> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({
            where: { id: subscriptionId },
            include: subscriptionInclude
         });
         if (!existing) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('user_subscriptions.not_found'));
         }
         if (userProfileId && existing.userProfileId !== userProfileId) {
            throw ApiError.forbidden(MessageHandler.getErrorMessage('unauthorized.access_denied'));
         }

         const newPlan = await this.prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
         if (!newPlan) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('subscription_plans.not_found'));
         }
         if (!newPlan.isActive) {
            throw new ApiError(
               MessageHandler.getErrorMessage('subscription_plans.inactive'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }
         if (newPlan.billingInterval === BillingInterval.LIFETIME) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.invalid_plan_change'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const currentPlan = existing.plan;
         if (newPlanId === existing.planId) {
            throw new ApiError(
               MessageHandler.getErrorMessage('user_subscriptions.invalid_plan_change'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const currentInfo = toPlanPriceInfo(currentPlan);
         const targetInfo = toPlanPriceInfo(newPlan);
         this.assertPlanChangeAllowed(existing.status, currentInfo, targetInfo);

         if (isUpgrade(currentInfo, targetInfo)) {
            const wasTrialing = existing.status === SubscriptionStatus.TRIALING;
            const proration = calculateProration(
               currentInfo,
               targetInfo,
               existing.currentPeriodStart,
               existing.currentPeriodEnd,
               new Date(),
               { trialConversion: wasTrialing }
            );

            const updated = await this.prisma.$transaction(async (tx) => {
               await tx.subscriptionBillingEvent.create({
                  data: {
                     userSubscriptionId: subscriptionId,
                     type: BillingEventType.PRORATION_CHARGE,
                     amount: proration.immediateCharge,
                     currency: proration.currency,
                     metadata: {
                        oldPlanId: existing.planId,
                        newPlanId,
                        credit: proration.credit,
                        newCost: proration.newCost,
                        remainingDays: proration.remainingDays,
                        periodDays: proration.periodDays,
                        trialEnded: wasTrialing
                     }
                  }
               });

               return tx.userSubscription.update({
                  where: { id: subscriptionId },
                  data: {
                     plan: { connect: { id: newPlanId } },
                     ...clearPendingPlanUpdate(),
                     pastDueRetryCount: 0,
                     ...(wasTrialing
                        ? { status: SubscriptionStatus.ACTIVE, trialEndsAt: null }
                        : {})
                  },
                  include: subscriptionInclude
               });
            });

            return {
               subscription: toUserSubscriptionWithPlan(updated),
               proration: {
                  ...proration,
                  ...(wasTrialing ? { trialEnded: true } : {})
               }
            };
         }

         if (isDowngrade(currentInfo, targetInfo)) {
            if (existing.pendingPlanId) {
               throw new ApiError(
                  MessageHandler.getErrorMessage('user_subscriptions.pending_change_exists'),
                  HttpStatusCode.CONFLICT,
                  ErrorType.CONFLICT
               );
            }

            const updated = await this.prisma.$transaction(async (tx) => {
               await tx.subscriptionBillingEvent.create({
                  data: {
                     userSubscriptionId: subscriptionId,
                     type: BillingEventType.PLAN_CHANGE_SCHEDULED,
                     amount: 0,
                     currency: newPlan.currency,
                     metadata: {
                        currentPlanId: existing.planId,
                        pendingPlanId: newPlanId,
                        effectiveAt: existing.currentPeriodEnd.toISOString()
                     }
                  }
               });

               return tx.userSubscription.update({
                  where: { id: subscriptionId },
                  data: {
                     pendingPlan: { connect: { id: newPlanId } },
                     pendingPlanChangeAt: existing.currentPeriodEnd,
                     pendingPlanChangeType: PlanChangeType.DOWNGRADE
                  },
                  include: subscriptionInclude
               });
            });

            return {
               subscription: toUserSubscriptionWithPlan(updated),
               scheduledChange: {
                  effectiveAt: existing.currentPeriodEnd,
                  pendingPlanId: newPlanId,
                  pendingPlan: toSubscriptionPlanDto(newPlan)
               }
            };
         }

         throw new ApiError(
            MessageHandler.getErrorMessage('user_subscriptions.invalid_plan_change'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
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
    * Daily job: renew due subscriptions, apply pending downgrades, dunning retries.
    */
   async processDueSubscriptions(): Promise<ProcessDueSubscriptionsResult> {
      const now = new Date();
      const result: ProcessDueSubscriptionsResult = {
         processed: 0,
         renewed: 0,
         expired: 0,
         pastDueEntered: 0,
         pastDueRetried: 0
      };

      const pastDueSubs = await this.prisma.userSubscription.findMany({
         where: { status: SubscriptionStatus.PAST_DUE },
         include: subscriptionInclude
      });

      for (const sub of pastDueSubs) {
         result.processed++;
         result.pastDueRetried++;
         const outcome = await this.processPastDueSubscription(sub, now);
         if (outcome === 'renewed') result.renewed++;
         if (outcome === 'expired') result.expired++;
      }

      const dueSubs = await this.prisma.userSubscription.findMany({
         where: {
            currentPeriodEnd: { lte: now },
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
         },
         include: subscriptionInclude
      });

      for (const sub of dueSubs) {
         result.processed++;
         if (sub.status === SubscriptionStatus.TRIALING) {
            const outcome = await this.processTrialingPeriodEnd(sub, now);
            if (outcome === 'renewed') result.renewed++;
            if (outcome === 'expired') result.expired++;
            if (outcome === 'past_due') result.pastDueEntered++;
         } else {
            const outcome = await this.processActivePeriodEnd(sub, now);
            if (outcome === 'renewed') result.renewed++;
            if (outcome === 'expired') result.expired++;
            if (outcome === 'past_due') result.pastDueEntered++;
         }
      }

      return result;
   }

   private async processPastDueSubscription(
      sub: Prisma.UserSubscriptionGetPayload<{ include: typeof subscriptionInclude }>,
      now: Date
   ): Promise<'renewed' | 'expired' | 'unchanged'> {
      const paid = await attemptRenewalPayment();
      if (paid) {
         await this.applySuccessfulRenewal(sub.id, now);
         return 'renewed';
      }

      const newRetryCount = sub.pastDueRetryCount + 1;
      await this.recordBillingEvent(
         sub.id,
         BillingEventType.RENEWAL_RETRY_FAILED,
         Number(sub.plan.price),
         sub.plan.currency,
         { pastDueRetryCount: newRetryCount }
      );

      if (newRetryCount >= 2) {
         await this.prisma.userSubscription.update({
            where: { id: sub.id },
            data: {
               status: SubscriptionStatus.EXPIRED,
               endDate: now,
               pastDueRetryCount: newRetryCount
            }
         });
         return 'expired';
      }

      await this.prisma.userSubscription.update({
         where: { id: sub.id },
         data: { pastDueRetryCount: newRetryCount }
      });
      return 'unchanged';
   }

   private async applyPendingPlanChange(subscriptionId: string): Promise<void> {
      const sub = await this.prisma.userSubscription.findUnique({
         where: { id: subscriptionId },
         select: { pendingPlanId: true }
      });
      if (!sub?.pendingPlanId) return;

      await this.prisma.userSubscription.update({
         where: { id: subscriptionId },
         data: {
            plan: { connect: { id: sub.pendingPlanId } },
            ...clearPendingPlanUpdate()
         }
      });
   }

   private async processActivePeriodEnd(
      sub: Prisma.UserSubscriptionGetPayload<{ include: typeof subscriptionInclude }>,
      now: Date
   ): Promise<'renewed' | 'expired' | 'past_due' | 'canceled'> {
      let current = sub;
      if (current.pendingPlanId) {
         await this.applyPendingPlanChange(current.id);
         const refreshed = await this.prisma.userSubscription.findUnique({
            where: { id: current.id },
            include: subscriptionInclude
         });
         if (refreshed) {
            current = refreshed;
         }
      }

      if (current.cancelAtPeriodEnd) {
         await this.prisma.userSubscription.update({
            where: { id: current.id },
            data: { status: SubscriptionStatus.CANCELED, endDate: now, autoRenew: false }
         });
         return 'canceled';
      }

      if (!current.autoRenew) {
         await this.prisma.userSubscription.update({
            where: { id: current.id },
            data: { status: SubscriptionStatus.EXPIRED, endDate: now }
         });
         return 'expired';
      }

      const paid = await attemptRenewalPayment();
      if (!paid) {
         await this.recordBillingEvent(
            current.id,
            BillingEventType.RENEWAL_FAILED,
            Number(current.plan.price),
            current.plan.currency,
            { atPeriodEnd: true }
         );
         await this.prisma.userSubscription.update({
            where: { id: current.id },
            data: {
               status: SubscriptionStatus.PAST_DUE,
               pastDueRetryCount: 0
            }
         });
         return 'past_due';
      }

      await this.applySuccessfulRenewal(current.id, now);
      return 'renewed';
   }

   private async processTrialingPeriodEnd(
      sub: Prisma.UserSubscriptionGetPayload<{ include: typeof subscriptionInclude }>,
      now: Date
   ): Promise<'renewed' | 'expired' | 'canceled' | 'past_due'> {
      if (sub.cancelAtPeriodEnd) {
         await this.prisma.userSubscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.CANCELED, endDate: now, autoRenew: false }
         });
         return 'canceled';
      }

      if (!sub.autoRenew) {
         await this.prisma.userSubscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.EXPIRED, endDate: now }
         });
         return 'expired';
      }

      const paid = await attemptRenewalPayment();
      if (!paid) {
         await this.recordBillingEvent(
            sub.id,
            BillingEventType.RENEWAL_FAILED,
            Number(sub.plan.price),
            sub.plan.currency,
            { atTrialEnd: true }
         );
         await this.prisma.userSubscription.update({
            where: { id: sub.id },
            data: {
               status: SubscriptionStatus.PAST_DUE,
               pastDueRetryCount: 0
            }
         });
         return 'past_due';
      }

      await this.applySuccessfulRenewal(sub.id, now, { clearTrial: true });
      return 'renewed';
   }

   private async applySuccessfulRenewal(
      subscriptionId: string,
      now: Date,
      options: { clearTrial?: boolean } = {}
   ): Promise<void> {
      const sub = await this.prisma.userSubscription.findUnique({
         where: { id: subscriptionId },
         include: subscriptionInclude
      });
      if (!sub) return;

      let planId = sub.planId;
      const updateData: Prisma.UserSubscriptionUpdateInput = {
         status: SubscriptionStatus.ACTIVE,
         pastDueRetryCount: 0,
         cancelAtPeriodEnd: false,
         canceledAt: null,
         endDate: null,
         ...clearPendingPlanUpdate()
      };

      if (options.clearTrial) {
         updateData.trialEndsAt = null;
      }

      if (sub.pendingPlanId) {
         planId = sub.pendingPlanId;
         updateData.plan = { connect: { id: sub.pendingPlanId } };
      }

      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan || plan.billingInterval === BillingInterval.LIFETIME) {
         return;
      }

      const newPeriodStart = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
      const newPeriodEnd = computePeriodEnd(newPeriodStart, plan.billingInterval);

      await this.prisma.$transaction(async (tx) => {
         await tx.subscriptionBillingEvent.create({
            data: {
               userSubscriptionId: subscriptionId,
               type: BillingEventType.RENEWAL_CHARGE,
               amount: roundMoney(Number(plan.price)),
               currency: plan.currency,
               metadata: {
                  planId,
                  periodStart: newPeriodStart.toISOString(),
                  periodEnd: newPeriodEnd.toISOString()
               }
            }
         });

         await tx.userSubscription.update({
            where: { id: subscriptionId },
            data: {
               ...updateData,
               currentPeriodStart: newPeriodStart,
               currentPeriodEnd: newPeriodEnd
            }
         });
      });
   }

   async createSubscription(data: CreateUserSubscriptionDto): Promise<UserSubscriptionWithPlan> {
      try {
         const userProfile = await this.prisma.userProfile.findUnique({
            where: { id: data.userProfileId }
         });
         if (!userProfile) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.user'));
         }

         const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: data.planId }
         });
         if (!plan) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('subscription_plans.not_found'));
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
            include: subscriptionInclude
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
               include: subscriptionInclude
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

   async getSubscriptionById(id: string): Promise<UserSubscriptionWithPlan> {
      try {
         const sub = await this.prisma.userSubscription.findUnique({
            where: { id },
            include: subscriptionInclude
         });
         if (!sub) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('user_subscriptions.not_found'));
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
            include: subscriptionInclude
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

   async updateSubscription(id: string, data: UpdateUserSubscriptionDto): Promise<UserSubscriptionDto> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({ where: { id } });
         if (!existing) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('user_subscriptions.not_found'));
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

   async cancelSubscription(id: string, options: CancelSubscriptionDto = {}): Promise<UserSubscriptionDto> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({ where: { id } });
         if (!existing) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('user_subscriptions.not_found'));
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

   async renewSubscription(id: string): Promise<UserSubscriptionDto> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({
            where: { id },
            include: { plan: true }
         });
         if (!existing) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('user_subscriptions.not_found'));
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

         await this.applySuccessfulRenewal(id, new Date(), {
            clearTrial: existing.status === SubscriptionStatus.TRIALING
         });

         const updated = await this.prisma.userSubscription.findUnique({ where: { id } });
         return toUserSubscriptionDto(updated!);
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

   async deleteSubscription(id: string): Promise<boolean> {
      try {
         const existing = await this.prisma.userSubscription.findUnique({ where: { id } });
         if (!existing) {
            throw ApiError.notFound(MessageHandler.getErrorMessage('user_subscriptions.not_found'));
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

   async getSubscriptionsByUserProfileId(
      userProfileId: string,
      queryParams: UserSubscriptionQueryParams = {}
   ): Promise<{ subscriptions: UserSubscriptionWithPlan[]; totalCount: number }> {
      return this.getAllSubscriptions({ ...queryParams, userProfileId });
   }
}
