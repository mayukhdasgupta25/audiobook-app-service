/**
 * UserSubscription plan change and lifecycle tests
 */
import { UserSubscriptionService } from '../../services/UserSubscriptionService';
import { HttpStatusCode } from '../../types/common';
import { BillingInterval, SubscriptionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key
   }
}));

jest.mock('../../services/subscriptionPaymentStub', () => ({
   attemptRenewalPayment: jest.fn()
}));

import { attemptRenewalPayment } from '../../services/subscriptionPaymentStub';

const basePlan = (tier: number, price: number) => ({
   id: `plan-${tier}`,
   name: `Plan ${tier}`,
   description: null,
   price: new Decimal(price),
   currency: 'INR',
   tierLevel: tier,
   billingInterval: BillingInterval.MONTHLY,
   trialDays: 0,
   features: null,
   isActive: true,
   createdAt: new Date(),
   updatedAt: new Date()
});

function buildSub(overrides: Partial<any> = {}): any {
   return {
      id: 'sub-1',
      userProfileId: 'user-1',
      planId: 'plan-1',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
      endDate: null,
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2026-02-01'),
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      autoRenew: true,
      paymentMethod: null,
      pendingPlanId: null,
      pendingPlanChangeAt: null,
      pendingPlanChangeType: null,
      pastDueRetryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: basePlan(1, 1000),
      pendingPlan: null,
      ...overrides
   };
}

describe('UserSubscriptionService plan change', () => {
   let service: UserSubscriptionService;
   let mockPrisma: any;

   beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma = {
         userSubscription: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            create: jest.fn()
         },
         subscriptionPlan: {
            findUnique: jest.fn()
         },
         subscriptionBillingEvent: {
            create: jest.fn()
         },
         $transaction: jest.fn((fn: (tx: any) => Promise<unknown>) =>
            fn({
               userSubscription: { update: jest.fn() },
               subscriptionBillingEvent: { create: jest.fn() }
            })
         )
      };
      service = new UserSubscriptionService(mockPrisma);
   });

   describe('changePlan', () => {
      it('schedules downgrade with pending fields', async () => {
         const existing = buildSub();
         mockPrisma.userSubscription.findUnique.mockResolvedValue(existing);
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(basePlan(0, 500));

         const pendingUpdate = jest.fn().mockResolvedValue({
            ...existing,
            pendingPlanId: 'plan-0',
            pendingPlanChangeAt: existing.currentPeriodEnd,
            pendingPlanChangeType: 'DOWNGRADE',
            pendingPlan: basePlan(0, 500)
         });

         mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
            fn({
               subscriptionBillingEvent: { create: jest.fn() },
               userSubscription: { update: pendingUpdate }
            })
         );

         const result = await service.changePlan('sub-1', 'plan-0', 'user-1');

         expect(result.scheduledChange).toBeDefined();
         expect(result.scheduledChange?.pendingPlanId).toBe('plan-0');
         expect(pendingUpdate).toHaveBeenCalled();
      });

      it('rejects plan change when PAST_DUE', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(
            buildSub({ status: SubscriptionStatus.PAST_DUE })
         );
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(basePlan(2, 2000));

         await expect(service.changePlan('sub-1', 'plan-2', 'user-1')).rejects.toMatchObject({
            statusCode: HttpStatusCode.PAYMENT_REQUIRED
         });
      });

      it('rejects downgrade during TRIALING', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(
            buildSub({ status: SubscriptionStatus.TRIALING })
         );
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(basePlan(0, 500));

         await expect(service.changePlan('sub-1', 'plan-0', 'user-1')).rejects.toMatchObject({
            message: 'user_subscriptions.cannot_change_plan_during_trial'
         });
      });
   });

   describe('processDueSubscriptions', () => {
      it('expires PAST_DUE after two failed retries', async () => {
         (attemptRenewalPayment as jest.Mock).mockResolvedValue(false);
         mockPrisma.userSubscription.findMany
            .mockResolvedValueOnce([
               buildSub({
                  status: SubscriptionStatus.PAST_DUE,
                  pastDueRetryCount: 1,
                  currentPeriodEnd: new Date('2026-01-01')
               })
            ])
            .mockResolvedValueOnce([]);

         mockPrisma.subscriptionBillingEvent.create.mockResolvedValue({});
         mockPrisma.userSubscription.update.mockResolvedValue({});

         const summary = await service.processDueSubscriptions();

         expect(summary.pastDueRetried).toBe(1);
         expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith(
            expect.objectContaining({
               data: expect.objectContaining({ status: SubscriptionStatus.EXPIRED })
            })
         );
      });

      it('renews ACTIVE subscription when payment succeeds', async () => {
         (attemptRenewalPayment as jest.Mock).mockResolvedValue(true);
         const dueSub = buildSub({ currentPeriodEnd: new Date('2020-01-01') });

         mockPrisma.userSubscription.findMany
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([dueSub]);

         mockPrisma.userSubscription.findUnique.mockResolvedValue(dueSub);
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(basePlan(1, 1000));
         mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
            fn({
               subscriptionBillingEvent: { create: jest.fn() },
               userSubscription: { update: jest.fn().mockResolvedValue(dueSub) }
            })
         );

         const summary = await service.processDueSubscriptions();

         expect(summary.renewed).toBeGreaterThanOrEqual(1);
      });
   });
});
