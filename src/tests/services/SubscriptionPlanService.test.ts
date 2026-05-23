/**
 * SubscriptionPlanService Tests
 */
import { SubscriptionPlanService } from '../../services/SubscriptionPlanService';
import { ApiError } from '../../types/ApiError';

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key
   }
}));

const mockPrisma = {
   subscriptionPlan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
   },
   userSubscription: {
      count: jest.fn()
   }
} as any;

describe('SubscriptionPlanService', () => {
   let service: SubscriptionPlanService;

   beforeEach(() => {
      service = new SubscriptionPlanService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('createPlan', () => {
      it('creates a plan successfully when name is unique', async () => {
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);
         mockPrisma.subscriptionPlan.create.mockResolvedValue({
            id: 'p1',
            name: 'Premium',
            description: null,
            price: '9.99',
            currency: 'USD',
            billingInterval: 'MONTHLY',
            trialDays: 0,
            features: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
         });

         const result = await service.createPlan({
            name: 'Premium',
            price: 9.99
         });

         expect(result.name).toBe('Premium');
         expect(result.price).toBe(9.99);
         expect(mockPrisma.subscriptionPlan.create).toHaveBeenCalled();
      });

      it('throws conflict on duplicate name', async () => {
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p1', name: 'Premium' });
         await expect(service.createPlan({ name: 'Premium', price: 1 })).rejects.toBeInstanceOf(ApiError);
      });

      it('throws validation error on negative price', async () => {
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);
         await expect(service.createPlan({ name: 'Premium', price: -1 })).rejects.toBeInstanceOf(ApiError);
      });

      it('throws validation error on negative tierLevel', async () => {
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);
         await expect(
            service.createPlan({ name: 'Premium', price: 9.99, tierLevel: -1 })
         ).rejects.toBeInstanceOf(ApiError);
      });

      it('persists tierLevel when provided', async () => {
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);
         mockPrisma.subscriptionPlan.create.mockResolvedValue({
            id: 'p1',
            name: 'Standard',
            description: null,
            price: '249',
            currency: 'INR',
            tierLevel: 2,
            billingInterval: 'MONTHLY',
            trialDays: 0,
            features: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
         });

         const result = await service.createPlan({
            name: 'Standard',
            price: 249,
            currency: 'INR',
            tierLevel: 2
         });

         expect(result.tierLevel).toBe(2);
         const createArgs = mockPrisma.subscriptionPlan.create.mock.calls[0][0];
         expect(createArgs.data.tierLevel).toBe(2);
      });

      it('trims plan name', async () => {
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);
         mockPrisma.subscriptionPlan.create.mockResolvedValue({
            id: 'p1', name: 'Premium', description: null, price: '5',
            currency: 'USD', billingInterval: 'MONTHLY', trialDays: 0,
            features: null, isActive: true, createdAt: new Date(), updatedAt: new Date()
         });

         await service.createPlan({ name: '  Premium  ', price: 5 });
         const callArgs = mockPrisma.subscriptionPlan.create.mock.calls[0][0];
         expect(callArgs.data.name).toBe('Premium');
      });
   });

   describe('getAllPlans', () => {
      it('returns paginated plans', async () => {
         mockPrisma.subscriptionPlan.count.mockResolvedValue(2);
         mockPrisma.subscriptionPlan.findMany.mockResolvedValue([
            { id: 'p1', name: 'Free', description: null, price: '0', currency: 'USD',
              billingInterval: 'MONTHLY', trialDays: 0, features: null, isActive: true,
              createdAt: new Date(), updatedAt: new Date() },
            { id: 'p2', name: 'Premium', description: null, price: '9.99', currency: 'USD',
              billingInterval: 'MONTHLY', trialDays: 7, features: null, isActive: true,
              createdAt: new Date(), updatedAt: new Date() }
         ]);

         const result = await service.getAllPlans({ page: 1, limit: 10 });
         expect(result.totalCount).toBe(2);
         expect(result.plans).toHaveLength(2);
      });

      it('applies isActive filter', async () => {
         mockPrisma.subscriptionPlan.count.mockResolvedValue(0);
         mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);

         await service.getAllPlans({ isActive: true });
         const callArgs = mockPrisma.subscriptionPlan.findMany.mock.calls[0][0];
         expect(callArgs.where.isActive).toBe(true);
      });

      it('throws on db error', async () => {
         mockPrisma.subscriptionPlan.count.mockRejectedValue(new Error('db'));
         await expect(service.getAllPlans()).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('getPlanById', () => {
      it('returns plan when found', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
            id: 'p1', name: 'Premium', description: null, price: '9.99', currency: 'USD',
            billingInterval: 'MONTHLY', trialDays: 0, features: null, isActive: true,
            createdAt: new Date(), updatedAt: new Date()
         });
         const result = await service.getPlanById('p1');
         expect(result.id).toBe('p1');
      });

      it('throws not found when missing', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);
         await expect(service.getPlanById('missing')).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('updatePlan', () => {
      it('updates fields', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p1', name: 'Old' });
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);
         mockPrisma.subscriptionPlan.update.mockResolvedValue({
            id: 'p1', name: 'New', description: null, price: '5', currency: 'USD',
            billingInterval: 'MONTHLY', trialDays: 0, features: null, isActive: true,
            createdAt: new Date(), updatedAt: new Date()
         });

         const result = await service.updatePlan('p1', { name: 'New' });
         expect(result.name).toBe('New');
      });

      it('throws on duplicate name', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p1', name: 'Old' });
         mockPrisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p2', name: 'New' });
         await expect(service.updatePlan('p1', { name: 'New' })).rejects.toBeInstanceOf(ApiError);
      });

      it('throws not found when missing', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);
         await expect(service.updatePlan('missing', { name: 'X' })).rejects.toBeInstanceOf(ApiError);
      });
   });

   describe('deletePlan', () => {
      it('deletes plan with no subscribers', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p1' });
         mockPrisma.userSubscription.count.mockResolvedValue(0);
         mockPrisma.subscriptionPlan.delete.mockResolvedValue({});

         const result = await service.deletePlan('p1');
         expect(result.deleted).toBe(true);
         expect(result.deactivated).toBe(false);
      });

      it('soft-deactivates plan with subscribers', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p1' });
         mockPrisma.userSubscription.count.mockResolvedValue(3);
         mockPrisma.subscriptionPlan.update.mockResolvedValue({});

         const result = await service.deletePlan('p1');
         expect(result.deleted).toBe(false);
         expect(result.deactivated).toBe(true);
         expect(mockPrisma.subscriptionPlan.delete).not.toHaveBeenCalled();
      });

      it('throws not found when missing', async () => {
         mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);
         await expect(service.deletePlan('missing')).rejects.toBeInstanceOf(ApiError);
      });
   });
});
