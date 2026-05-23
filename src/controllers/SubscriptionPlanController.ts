/**
 * SubscriptionPlan Controller
 * Handles HTTP requests and responses for subscription plan operations.
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SubscriptionPlanService } from '../services/SubscriptionPlanService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import {
   CreateSubscriptionPlanDto,
   UpdateSubscriptionPlanDto,
   SubscriptionPlanQueryParams
} from '../models/SubscriptionPlanDto';

export class SubscriptionPlanController {
   private planService: SubscriptionPlanService;

   constructor(prisma: PrismaClient) {
      this.planService = new SubscriptionPlanService(prisma);
   }

   /**
    * @swagger
    * /api/v1/subscription-plans:
    *   post:
    *     summary: Create a new subscription plan
    *     tags: [Subscriptions]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [name, price]
    *             properties:
    *               name:
    *                 type: string
    *               description:
    *                 type: string
    *               price:
    *                 type: number
    *               currency:
    *                 type: string
    *               billingInterval:
    *                 type: string
    *                 enum: [MONTHLY, QUARTERLY, YEARLY, LIFETIME]
    *               trialDays:
    *                 type: integer
    *               features:
    *                 type: object
    *               isActive:
    *                 type: boolean
    *     responses:
    *       201:
    *         description: Subscription plan created
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       409:
    *         $ref: '#/components/responses/Conflict'
    */
   createPlan = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const data: CreateSubscriptionPlanDto = req.body;
      const created = await this.planService.createPlan(data);
      ResponseHandler.success(res, created, MessageHandler.getSuccessMessage('subscription_plans.created'), 201);
   });

   /**
    * @swagger
    * /api/v1/subscription-plans:
    *   get:
    *     summary: List subscription plans
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - name: isActive
    *         in: query
    *         schema:
    *           type: boolean
    *       - name: billingInterval
    *         in: query
    *         schema:
    *           type: string
    *           enum: [MONTHLY, QUARTERLY, YEARLY, LIFETIME]
    *       - name: search
    *         in: query
    *         schema:
    *           type: string
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    */
   getAllPlans = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const queryParams: SubscriptionPlanQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: (req.query['sortBy'] as string) || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc',
         isActive: req.query['isActive'] !== undefined ? req.query['isActive'] === 'true' : undefined,
         billingInterval: req.query['billingInterval'] as any,
         search: req.query['search'] as string | undefined
      };

      const { plans, totalCount } = await this.planService.getAllPlans(queryParams);

      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );

      ResponseHandler.paginated(
         res,
         plans,
         pagination,
         MessageHandler.getSuccessMessage('subscription_plans.retrieved')
      );
   });

   /**
    * @swagger
    * /api/v1/subscription-plans/{id}:
    *   get:
    *     summary: Get a subscription plan by ID
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Plan retrieved
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   getPlanById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const plan = await this.planService.getPlanById(id);
      ResponseHandler.success(res, plan, MessageHandler.getSuccessMessage('subscription_plans.retrieved_by_id'));
   });

   /**
    * @swagger
    * /api/v1/subscription-plans/{id}:
    *   put:
    *     summary: Update a subscription plan
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Plan updated
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   updatePlan = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const data: UpdateSubscriptionPlanDto = req.body;
      const updated = await this.planService.updatePlan(id, data);
      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('subscription_plans.updated'));
   });

   /**
    * @swagger
    * /api/v1/subscription-plans/{id}:
    *   delete:
    *     summary: Delete (or deactivate) a subscription plan
    *     description: |
    *       Plans without subscribers are deleted. Plans referenced by existing
    *       subscriptions are soft-deactivated to preserve history.
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Plan deleted or deactivated
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   deletePlan = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const result = await this.planService.deletePlan(id);
      const messageKey = result.deactivated ? 'subscription_plans.deactivated' : 'subscription_plans.deleted';
      ResponseHandler.success(res, result, MessageHandler.getSuccessMessage(messageKey));
   });
}
