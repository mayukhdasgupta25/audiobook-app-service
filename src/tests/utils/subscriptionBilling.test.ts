/**
 * subscriptionBilling utility tests
 */
import { calculateProration } from '../../utils/subscriptionBilling';
import { BillingInterval } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('calculateProration', () => {
   const oldPlan = {
      id: 'old',
      price: new Decimal(1000),
      tierLevel: 1,
      billingInterval: BillingInterval.MONTHLY,
      currency: 'INR'
   };
   const newPlan = {
      id: 'new',
      price: new Decimal(2000),
      tierLevel: 2,
      billingInterval: BillingInterval.MONTHLY,
      currency: 'INR'
   };

   it('matches the 15/30 day upgrade example (₹500 immediate charge)', () => {
      const periodStart = new Date('2026-01-01T00:00:00Z');
      const periodEnd = new Date('2026-01-31T00:00:00Z');
      const asOf = new Date('2026-01-16T00:00:00Z');

      const result = calculateProration(oldPlan, newPlan, periodStart, periodEnd, asOf);

      expect(result.credit).toBe(500);
      expect(result.newCost).toBe(1000);
      expect(result.immediateCharge).toBe(500);
      expect(result.nextRenewalAmount).toBe(2000);
   });

   it('uses zero credit for trial conversion', () => {
      const periodStart = new Date('2026-01-01T00:00:00Z');
      const periodEnd = new Date('2026-01-31T00:00:00Z');
      const asOf = new Date('2026-01-16T00:00:00Z');

      const result = calculateProration(oldPlan, newPlan, periodStart, periodEnd, asOf, {
         trialConversion: true
      });

      expect(result.credit).toBe(0);
      expect(result.immediateCharge).toBe(1000);
   });
});
