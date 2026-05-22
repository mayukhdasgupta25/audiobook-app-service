/**
 * UserSubscriptionService Tests
 */
import { UserSubscriptionService, computePeriodEnd } from '../../services/UserSubscriptionService';
import { ApiError } from '../../types/ApiError';
import { BillingInterval, SubscriptionStatus } from '@prisma/client';

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key
   }
}));

const mockPrisma = {
   userProfile: {
      findUnique: jest.fn()
   },
   subscriptionPlan: {
      findUnique: jest.fn()
   },
   subscriptionBillingEvent: {
      create: jest.fn()
   },
   userSubscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
   },
   $transaction: jest.fn()
} as any;

const basePlan = {
   id: 'plan1',
   name: 'Premium',
   description: null,
   price: '9.99',
   currency: 'USD',
   billingInterval: 'MONTHLY' as BillingInterval,
   trialDays: 0,
   features: null,
   isActive: true,
   createdAt: new Date(),
   updatedAt: new Date()
};

function buildSub(overrides: Partial<any> = {}): any {
   return {
      id: 'sub1',
      userProfileId: 'user1',
      planId: 'plan1',
      status: 'ACTIVE' as SubscriptionStatus,
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
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      plan: basePlan,
      pendingPlan: null,
      ...overrides
   };
}

describe('UserSubscriptionService', () => {
   let service: UserSubscriptionService;

   beforeEach(() => {
      service = new UserSubscriptionService(mockPrisma);
      jest.clearAllMocks();
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
         fn({
            subscriptionBillingEvent: { create: jest.fn().mockResolvedValue({}) },
            userSubscription: {
               update: jest.fn().mockResolvedValue(buildSub({ status: 'ACTIVE' }))
            }
         })
      );
   });

   describe('computePeriodEnd', () => {
      it('adds one month for MONTHLY', () => {
         const start = new Date('2026-01-15T00:00:00Z');
         const end = computePeriodEnd(start, 'MONTHLY' as BillingInterval);
         expect(end.getUTCMonth()).toBe(1); // February
      });

      it('returns far-future date for LIFETIME', () => {
         const end = computePeriodEnd(new Date(), 'LIFETIME' as BillingInterval);
         expect(end.getUTCFullYear()).toBeGreaterThan(9000);
      });

      it('adds three months for QUARTERLY', () => {
         const start = new Date('2026-01-15T00:00:00Z');
         const end = computePeriodEnd(start, 'QUARTERLY' as BillingInterval);
         expect(end.getUTCMonth()).toBe(3); // April
      });

      it('adds twelve months for YEARLY', () => {
         const start = new Date('2026-01-15T00:00:00Z');
         const end = computePeriodEnd(start, 'YEARLY' as BillingInterval);
         expect(end.getUTCFullYear()).toBe(2027);
      });
   });

   describe('createSubscription', () => {
      it('creates an active subscription when no trial', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'user1' });
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(basePlan);
         mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
         mockPrisma.userSubscription.create.mockResolvedValue(buildSub());

         const result = await service.createSubscription({ userProfileId: 'user1', planId: 'plan1' });
         expect(result.status).toBe('ACTIVE');
         const callArgs = mockPrisma.userSubscription.create.mock.calls[0][0];
         expect(callArgs.data.status).toBe('ACTIVE');
      });

      it('creates a trialing subscription when plan has trial days', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'user1' });
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ ...basePlan, trialDays: 14 });
         mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
         mockPrisma.userSubscription.create.mockResolvedValue(buildSub({ status: 'TRIALING' }));

         const result = await service.createSubscription({ userProfileId: 'user1', planId: 'plan1' });
         expect(result.status).toBe('TRIALING');
         const callArgs = mockPrisma.userSubscription.create.mock.calls[0][0];
         expect(callArgs.data.status).toBe('TRIALING');
         expect(callArgs.data.trialEndsAt).toBeInstanceOf(Date);
      });

      it('rejects when user profile not found', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue(null);
         await expect(
            service.createSubscription({ userProfileId: 'missing', planId: 'plan1' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects when plan not found', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'user1' });
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);
         await expect(
            service.createSubscription({ userProfileId: 'user1', planId: 'missing' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects when plan is inactive', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'user1' });
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ ...basePlan, isActive: false });
         await expect(
            service.createSubscription({ userProfileId: 'user1', planId: 'plan1' })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects when user already has an active subscription', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'user1' });
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(basePlan);
         mockPrisma.userSubscription.findFirst.mockResolvedValue({ id: 'existing', status: 'ACTIVE' });
         await expect(
            service.createSubscription({ userProfileId: 'user1', planId: 'plan1' })
         ).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('cancelSubscription', () => {
      it('cancels at period end by default', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub());
         mockPrisma.userSubscription.update.mockResolvedValue(buildSub({
            cancelAtPeriodEnd: true,
            canceledAt: new Date(),
            autoRenew: false
         }));

         const result = await service.cancelSubscription('sub1');
         expect(result.cancelAtPeriodEnd).toBe(true);
         expect(result.autoRenew).toBe(false);
         const callArgs = mockPrisma.userSubscription.update.mock.calls[0][0];
         expect(callArgs.data.status).toBeUndefined();
      });

      it('cancels immediately when cancelAtPeriodEnd is false', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub());
         mockPrisma.userSubscription.update.mockResolvedValue(buildSub({
            status: 'CANCELED',
            cancelAtPeriodEnd: false,
            canceledAt: new Date(),
            endDate: new Date(),
            autoRenew: false
         }));

         const result = await service.cancelSubscription('sub1', { cancelAtPeriodEnd: false });
         expect(result.status).toBe('CANCELED');
         const callArgs = mockPrisma.userSubscription.update.mock.calls[0][0];
         expect(callArgs.data.status).toBe('CANCELED');
         expect(callArgs.data.endDate).toBeInstanceOf(Date);
      });

      it('rejects already-canceled subscriptions', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub({ status: 'CANCELED' }));
         await expect(service.cancelSubscription('sub1')).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects when subscription not found', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(null);
         await expect(service.cancelSubscription('missing')).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('renewSubscription', () => {
      it('renews an active monthly subscription', async () => {
         const renewed = buildSub({
            status: 'ACTIVE',
            currentPeriodStart: new Date('2026-02-01'),
            currentPeriodEnd: new Date('2026-03-01')
         });
         mockPrisma.userSubscription.findUnique
            .mockResolvedValueOnce(buildSub())
            .mockResolvedValueOnce(buildSub())
            .mockResolvedValueOnce(renewed);
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(basePlan);

         const result = await service.renewSubscription('sub1');
         expect(result.status).toBe('ACTIVE');
         expect(mockPrisma.$transaction).toHaveBeenCalled();
      });

      it('rejects renewing canceled subscriptions', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub({ status: 'CANCELED' }));
         await expect(service.renewSubscription('sub1')).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects renewing lifetime subscriptions', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub({
            plan: { ...basePlan, billingInterval: 'LIFETIME' }
         }));
         await expect(service.renewSubscription('sub1')).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('updateSubscription', () => {
      it('updates autoRenew', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub());
         mockPrisma.userSubscription.update.mockResolvedValue(buildSub({ autoRenew: false }));

         const result = await service.updateSubscription('sub1', { autoRenew: false });
         expect(result.autoRenew).toBe(false);
      });

      it('rejects empty update body', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub());
         await expect(service.updateSubscription('sub1', {})).rejects.toBeInstanceOf(ApiError);
      });

      it('rejects when not found', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(null);
         await expect(service.updateSubscription('missing', { autoRenew: true })).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('getActiveSubscriptionForUser', () => {
      it('returns active subscription', async () => {
         mockPrisma.userSubscription.findFirst.mockResolvedValue(buildSub());
         const result = await service.getActiveSubscriptionForUser('user1');
         expect(result).not.toBeNull();
         expect(result?.id).toBe('sub1');
      });

      it('returns null when none', async () => {
         mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
         const result = await service.getActiveSubscriptionForUser('user1');
         expect(result).toBeNull();
      });
   });

   describe('deleteSubscription', () => {
      it('deletes successfully', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(buildSub());
         mockPrisma.userSubscription.delete.mockResolvedValue({});
         const result = await service.deleteSubscription('sub1');
         expect(result).toBe(true);
      });

      it('throws when not found', async () => {
         mockPrisma.userSubscription.findUnique.mockResolvedValue(null);
         await expect(service.deleteSubscription('missing')).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('getAllSubscriptions', () => {
      it('returns paginated subscriptions', async () => {
         mockPrisma.userSubscription.count.mockResolvedValue(1);
         mockPrisma.userSubscription.findMany.mockResolvedValue([buildSub()]);
         const result = await service.getAllSubscriptions({ page: 1, limit: 10 });
         expect(result.totalCount).toBe(1);
         expect(result.subscriptions).toHaveLength(1);
      });
   });
});
