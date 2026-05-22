/**
 * Subscription billing helpers: proration and period day calculations.
 */
import { BillingInterval } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface PlanPriceInfo {
  id: string;
  price: Decimal | number;
  tierLevel: number;
  billingInterval: BillingInterval;
  currency: string;
}

export interface ProrationResult {
  remainingDays: number;
  periodDays: number;
  credit: number;
  newCost: number;
  immediateCharge: number;
  nextRenewalAmount: number;
  currency: string;
}

export interface CalculateProrationOptions {
  trialConversion?: boolean;
}

/** Round money to 2 decimal places. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function planPriceNumber(price: Decimal | number): number {
  return typeof price === 'number' ? price : Number(price);
}

/** Whole days between two dates (minimum 0). */
export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Prorate plan change within the current billing period.
 * credit = oldPrice × (remainingDays / periodDays) unless trialConversion (credit = 0).
 */
export function calculateProration(
  oldPlan: PlanPriceInfo,
  newPlan: PlanPriceInfo,
  periodStart: Date,
  periodEnd: Date,
  asOf: Date = new Date(),
  options: CalculateProrationOptions = {}
): ProrationResult {
  const periodDays = Math.max(1, daysBetween(periodStart, periodEnd));
  const remainingDays = Math.min(periodDays, daysBetween(asOf, periodEnd));

  const oldPrice = planPriceNumber(oldPlan.price);
  const newPrice = planPriceNumber(newPlan.price);

  const credit = options.trialConversion
    ? 0
    : roundMoney(oldPrice * (remainingDays / periodDays));
  const newCost = roundMoney(newPrice * (remainingDays / periodDays));
  const immediateCharge = roundMoney(Math.max(0, newCost - credit));

  return {
    remainingDays,
    periodDays,
    credit,
    newCost,
    immediateCharge,
    nextRenewalAmount: roundMoney(newPrice),
    currency: newPlan.currency
  };
}

export function isUpgrade(current: PlanPriceInfo, target: PlanPriceInfo): boolean {
  if (target.tierLevel !== current.tierLevel) {
    return target.tierLevel > current.tierLevel;
  }
  return planPriceNumber(target.price) > planPriceNumber(current.price);
}

export function isDowngrade(current: PlanPriceInfo, target: PlanPriceInfo): boolean {
  if (target.tierLevel !== current.tierLevel) {
    return target.tierLevel < current.tierLevel;
  }
  return planPriceNumber(target.price) < planPriceNumber(current.price);
}
