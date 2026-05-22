/**
 * UserSubscription DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import {
   UserSubscription as PrismaUserSubscription,
   SubscriptionStatus,
   PlanChangeType
} from '@prisma/client';
import { SubscriptionPlanDto, toSubscriptionPlanDto } from './SubscriptionPlanDto';

export interface UserSubscriptionDto {
   id: string;
   userProfileId: string;
   planId: string;
   status: SubscriptionStatus;
   startDate: Date;
   endDate: Date | null;
   currentPeriodStart: Date;
   currentPeriodEnd: Date;
   trialEndsAt: Date | null;
   cancelAtPeriodEnd: boolean;
   canceledAt: Date | null;
   autoRenew: boolean;
   paymentMethod: string | null;
   pendingPlanId: string | null;
   pendingPlanChangeAt: Date | null;
   pendingPlanChangeType: PlanChangeType | null;
   pastDueRetryCount: number;
   createdAt: Date;
   updatedAt: Date;
}

export interface UserSubscriptionWithPlan extends UserSubscriptionDto {
   plan: SubscriptionPlanDto;
   pendingPlan?: SubscriptionPlanDto | null;
}

export interface ProrationBreakdownDto {
   remainingDays: number;
   periodDays: number;
   credit: number;
   newCost: number;
   immediateCharge: number;
   nextRenewalAmount: number;
   currency: string;
   trialEnded?: boolean;
}

export interface ScheduledPlanChangeDto {
   effectiveAt: Date;
   pendingPlanId: string;
   pendingPlan?: SubscriptionPlanDto;
}

export interface ChangePlanResultDto {
   subscription: UserSubscriptionWithPlan;
   proration?: ProrationBreakdownDto;
   scheduledChange?: ScheduledPlanChangeDto;
}

export interface CreateUserSubscriptionDto {
   userProfileId: string;
   planId: string;
   autoRenew?: boolean;
   paymentMethod?: string;
   startDate?: Date | string;
   startTrial?: boolean;
}

export interface UpdateUserSubscriptionDto {
   autoRenew?: boolean;
   paymentMethod?: string | null;
   cancelAtPeriodEnd?: boolean;
   status?: SubscriptionStatus;
}

export interface ChangePlanDto {
   planId: string;
}

export interface CancelSubscriptionDto {
   cancelAtPeriodEnd?: boolean;
}

export interface UserSubscriptionQueryParams {
   page?: number | undefined;
   limit?: number | undefined;
   sortBy?: string | undefined;
   sortOrder?: 'asc' | 'desc' | undefined;
   userProfileId?: string | undefined;
   planId?: string | undefined;
   status?: SubscriptionStatus | undefined;
}

const subscriptionInclude = {
   plan: true,
   pendingPlan: true
} as const;

export function toUserSubscriptionDto(sub: PrismaUserSubscription): UserSubscriptionDto {
   return {
      id: sub.id,
      userProfileId: sub.userProfileId,
      planId: sub.planId,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate ?? null,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      canceledAt: sub.canceledAt ?? null,
      autoRenew: sub.autoRenew,
      paymentMethod: sub.paymentMethod ?? null,
      pendingPlanId: sub.pendingPlanId ?? null,
      pendingPlanChangeAt: sub.pendingPlanChangeAt ?? null,
      pendingPlanChangeType: sub.pendingPlanChangeType ?? null,
      pastDueRetryCount: sub.pastDueRetryCount ?? 0,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
   };
}

export function toUserSubscriptionWithPlan(sub: PrismaUserSubscription & {
   plan: Parameters<typeof toSubscriptionPlanDto>[0];
   pendingPlan?: Parameters<typeof toSubscriptionPlanDto>[0] | null;
}): UserSubscriptionWithPlan {
   return {
      ...toUserSubscriptionDto(sub),
      plan: toSubscriptionPlanDto(sub.plan),
      pendingPlan: sub.pendingPlan ? toSubscriptionPlanDto(sub.pendingPlan) : null
   };
}

export { subscriptionInclude };
