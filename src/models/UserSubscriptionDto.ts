/**
 * UserSubscription DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import {
   UserSubscription as PrismaUserSubscription,
   SubscriptionStatus
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
   createdAt: Date;
   updatedAt: Date;
}

export interface UserSubscriptionWithPlan extends UserSubscriptionDto {
   plan: SubscriptionPlanDto;
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
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
   };
}

export function toUserSubscriptionWithPlan(sub: any): UserSubscriptionWithPlan {
   return {
      ...toUserSubscriptionDto(sub),
      plan: toSubscriptionPlanDto(sub.plan)
   };
}
