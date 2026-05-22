/**
 * PATCH /subscriptions/:id/plan controller tests
 */
import { UserSubscriptionController } from '../../controllers/UserSubscriptionController';
import { UserSubscriptionService } from '../../services/UserSubscriptionService';
import { ResponseHandler } from '../../utils/ResponseHandler';

jest.mock('../../services/UserSubscriptionService');
jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
      getSuccessMessage: (key: string) => key
   }
}));
jest.mock('../../utils/ResponseHandler', () => ({
   ResponseHandler: {
      success: jest.fn(),
      paginated: jest.fn(),
      validationError: jest.fn(),
      calculatePagination: jest.fn()
   }
}));

const flushPromises = (): Promise<void> =>
   new Promise<void>((resolve) => setImmediate(resolve));

describe('UserSubscriptionController changeSubscriptionPlan', () => {
   let controller: UserSubscriptionController;
   let mockService: jest.Mocked<UserSubscriptionService>;
   let mockPrisma: any;
   let mockReq: any;
   let mockRes: any;

   beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma = {
         userProfile: {
            findUnique: jest.fn().mockResolvedValue({ id: 'profile-1' })
         }
      };
      mockReq = {
         params: { id: 'sub-1' },
         body: { planId: 'plan-2' },
         user: { id: 'auth-1' }
      };
      mockReq.next = jest.fn();
      mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      controller = new UserSubscriptionController(mockPrisma);
      mockService = (controller as any).subscriptionService;
   });

   it('returns 200 with proration on upgrade', async () => {
      mockService.changePlan.mockResolvedValue({
         subscription: { id: 'sub-1', planId: 'plan-2' } as any,
         proration: {
            credit: 500,
            newCost: 1000,
            immediateCharge: 500,
            nextRenewalAmount: 2000,
            currency: 'INR',
            remainingDays: 15,
            periodDays: 30
         }
      });

      await controller.changeSubscriptionPlan(mockReq, mockRes, mockReq.next);
      await flushPromises();

      expect(mockService.changePlan).toHaveBeenCalledWith('sub-1', 'plan-2', 'profile-1');
      expect(ResponseHandler.success).toHaveBeenCalledWith(
         mockRes,
         expect.objectContaining({ proration: expect.any(Object) }),
         'user_subscriptions.plan_changed'
      );
   });
});
