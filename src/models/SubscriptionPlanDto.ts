/**
 * SubscriptionPlan DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { SubscriptionPlan as PrismaSubscriptionPlan, BillingInterval } from '@prisma/client';

export interface SubscriptionPlanDto {
   id: string;
   name: string;
   description: string | null;
   price: number;
   currency: string;
   tierLevel: number;
   billingInterval: BillingInterval;
   trialDays: number;
   features: any;
   isActive: boolean;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateSubscriptionPlanDto {
   name: string;
   description?: string;
   price: number;
   currency?: string;
   tierLevel?: number;
   billingInterval?: BillingInterval;
   trialDays?: number;
   features?: any;
   isActive?: boolean;
}

export interface UpdateSubscriptionPlanDto {
   name?: string;
   description?: string | null;
   price?: number;
   currency?: string;
   tierLevel?: number;
   billingInterval?: BillingInterval;
   trialDays?: number;
   features?: any;
   isActive?: boolean;
}

export interface SubscriptionPlanQueryParams {
   page?: number | undefined;
   limit?: number | undefined;
   sortBy?: string | undefined;
   sortOrder?: 'asc' | 'desc' | undefined;
   isActive?: boolean | undefined;
   billingInterval?: BillingInterval | undefined;
   search?: string | undefined;
}

/**
 * Convert Prisma SubscriptionPlan model to SubscriptionPlanDto.
 * The price column is stored as Decimal; coerce to number for API responses.
 */
export function toSubscriptionPlanDto(plan: PrismaSubscriptionPlan): SubscriptionPlanDto {
   return {
      id: plan.id,
      name: plan.name,
      description: plan.description ?? null,
      price: typeof plan.price === 'number' ? plan.price : Number(plan.price.toString()),
      currency: plan.currency,
      tierLevel: (plan as PrismaSubscriptionPlan & { tierLevel?: number }).tierLevel ?? 0,
      billingInterval: plan.billingInterval,
      trialDays: plan.trialDays,
      features: plan.features ?? null,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
   };
}
