/**
 * UserSubscription Controller
 * Handles HTTP requests and responses for user subscription operations.
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserSubscriptionService } from '../services/UserSubscriptionService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { ApiError } from '../types/ApiError';
import { HttpStatusCode, ErrorType } from '../types/common';
import {
   CreateUserSubscriptionDto,
   UpdateUserSubscriptionDto,
   CancelSubscriptionDto,
   ChangePlanDto,
   UserSubscriptionQueryParams
} from '../models/UserSubscriptionDto';
import { AuthenticatedRequest } from '../types/auth';

export class UserSubscriptionController {
   private subscriptionService: UserSubscriptionService;
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
      this.subscriptionService = new UserSubscriptionService(prisma);
   }

   /**
    * Resolve the current authenticated user's UserProfile id.
    * The JWT carries the auth-service user id (req.user.id), which we map to
    * the local UserProfile via the unique userId column.
    */
   private async resolveUserProfileId(req: Request): Promise<string> {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser?.id) {
         throw new ApiError(
            MessageHandler.getErrorMessage('unauthorized.not_authenticated'),
            HttpStatusCode.UNAUTHORIZED,
            ErrorType.UNAUTHORIZED
         );
      }
      const profile = await this.prisma.userProfile.findUnique({
         where: { userId: authUser.id },
         select: { id: true }
      });
      if (!profile) {
         throw new ApiError(
            MessageHandler.getErrorMessage('not_found.user'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }
      return profile.id;
   }

   /**
    * @swagger
    * /api/v1/subscriptions:
    *   post:
    *     summary: Subscribe a user to a plan
    *     tags: [Subscriptions]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [planId]
    *             properties:
    *               userProfileId:
    *                 type: string
    *                 description: Optional. Defaults to the authenticated user's profile.
    *               planId:
    *                 type: string
    *               autoRenew:
    *                 type: boolean
    *               paymentMethod:
    *                 type: string
    *               startTrial:
    *                 type: boolean
    *     responses:
    *       201:
    *         description: Subscription created
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       409:
    *         $ref: '#/components/responses/Conflict'
    */
   createSubscription = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const body = req.body as CreateUserSubscriptionDto;
      const userProfileId = body.userProfileId || (await this.resolveUserProfileId(req));
      const created = await this.subscriptionService.createSubscription({
         ...body,
         userProfileId
      });
      ResponseHandler.success(res, created, MessageHandler.getSuccessMessage('user_subscriptions.created'), 201);
   });

   /**
    * @swagger
    * /api/v1/subscriptions:
    *   get:
    *     summary: List subscriptions (admin/global view)
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - name: userProfileId
    *         in: query
    *         schema:
    *           type: string
    *       - name: planId
    *         in: query
    *         schema:
    *           type: string
    *       - name: status
    *         in: query
    *         schema:
    *           type: string
    *           enum: [PENDING, TRIALING, ACTIVE, PAST_DUE, PAUSED, CANCELED, EXPIRED]
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    */
   getAllSubscriptions = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const queryParams: UserSubscriptionQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: (req.query['sortBy'] as string) || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc',
         userProfileId: req.query['userProfileId'] as string | undefined,
         planId: req.query['planId'] as string | undefined,
         status: req.query['status'] as any
      };

      const { subscriptions, totalCount } = await this.subscriptionService.getAllSubscriptions(queryParams);
      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );

      ResponseHandler.paginated(
         res,
         subscriptions,
         pagination,
         MessageHandler.getSuccessMessage('user_subscriptions.retrieved')
      );
   });

   /**
    * @swagger
    * /api/v1/subscriptions/me:
    *   get:
    *     summary: Get the current user's active subscription
    *     tags: [Subscriptions]
    *     responses:
    *       200:
    *         description: Active subscription, or null if none
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   getMySubscription = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const userProfileId = await this.resolveUserProfileId(req);
      const sub = await this.subscriptionService.getActiveSubscriptionForUser(userProfileId);
      ResponseHandler.success(res, sub, MessageHandler.getSuccessMessage('user_subscriptions.retrieved_by_id'));
   });

   /**
    * @swagger
    * /api/v1/subscriptions/me/history:
    *   get:
    *     summary: Get the current user's subscription history
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    */
   getMySubscriptionHistory = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const userProfileId = await this.resolveUserProfileId(req);
      const queryParams: UserSubscriptionQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: (req.query['sortBy'] as string) || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc'
      };
      const { subscriptions, totalCount } = await this.subscriptionService.getSubscriptionsByUserProfileId(
         userProfileId,
         queryParams
      );
      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );
      ResponseHandler.paginated(
         res,
         subscriptions,
         pagination,
         MessageHandler.getSuccessMessage('user_subscriptions.retrieved')
      );
   });

   /**
    * @swagger
    * /api/v1/subscriptions/user/{userProfileId}:
    *   get:
    *     summary: Get a user's subscription history
    *     tags: [Subscriptions]
    *     parameters:
    *       - name: userProfileId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    */
   getSubscriptionsByUser = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { userProfileId } = req.params as { userProfileId: string };
      const queryParams: UserSubscriptionQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: (req.query['sortBy'] as string) || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc'
      };
      const { subscriptions, totalCount } = await this.subscriptionService.getSubscriptionsByUserProfileId(
         userProfileId,
         queryParams
      );
      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );
      ResponseHandler.paginated(
         res,
         subscriptions,
         pagination,
         MessageHandler.getSuccessMessage('user_subscriptions.retrieved')
      );
   });

   /**
    * @swagger
    * /api/v1/subscriptions/{id}:
    *   get:
    *     summary: Get a subscription by ID
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Subscription retrieved
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   getSubscriptionById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const sub = await this.subscriptionService.getSubscriptionById(id);
      ResponseHandler.success(res, sub, MessageHandler.getSuccessMessage('user_subscriptions.retrieved_by_id'));
   });

   /**
    * @swagger
    * /api/v1/subscriptions/{id}:
    *   put:
    *     summary: Update a subscription
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Subscription updated
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   updateSubscription = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const data: UpdateUserSubscriptionDto = req.body;
      const updated = await this.subscriptionService.updateSubscription(id, data);
      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('user_subscriptions.updated'));
   });

   /**
    * @swagger
    * /api/v1/subscriptions/{id}/plan:
    *   patch:
    *     summary: Upgrade or downgrade subscription plan
    *     description: |
    *       Upgrades apply immediately with prorated charge. Downgrades take effect
    *       at the end of the current billing period.
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [planId]
    *             properties:
    *               planId:
    *                 type: string
    *     responses:
    *       200:
    *         description: Plan change processed
    *       402:
    *         description: Payment required (past-due subscription)
    */
   changeSubscriptionPlan = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const { planId } = req.body as ChangePlanDto;
      const userProfileId = await this.resolveUserProfileId(req);
      const result = await this.subscriptionService.changePlan(id, planId, userProfileId);
      const message = result.scheduledChange
         ? MessageHandler.getSuccessMessage('user_subscriptions.plan_downgrade_scheduled')
         : MessageHandler.getSuccessMessage('user_subscriptions.plan_changed');
      ResponseHandler.success(res, result, message);
   });

   /**
    * @swagger
    * /api/v1/subscriptions/{id}/cancel:
    *   post:
    *     summary: Cancel a subscription
    *     description: |
    *       By default the subscription is canceled at the end of the current
    *       billing period. Set `cancelAtPeriodEnd=false` to cancel immediately.
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     requestBody:
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               cancelAtPeriodEnd:
    *                 type: boolean
    *     responses:
    *       200:
    *         description: Subscription canceled
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   cancelSubscription = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const data: CancelSubscriptionDto = req.body || {};
      const updated = await this.subscriptionService.cancelSubscription(id, data);
      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('user_subscriptions.canceled'));
   });

   /**
    * @swagger
    * /api/v1/subscriptions/{id}/renew:
    *   post:
    *     summary: Renew a subscription for another billing period
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Subscription renewed
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   renewSubscription = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const updated = await this.subscriptionService.renewSubscription(id);
      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('user_subscriptions.renewed'));
   });

   /**
    * @swagger
    * /api/v1/subscriptions/{id}:
    *   delete:
    *     summary: Delete a subscription record
    *     tags: [Subscriptions]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Subscription deleted
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   deleteSubscription = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      await this.subscriptionService.deleteSubscription(id);
      ResponseHandler.success(res, { deleted: true }, MessageHandler.getSuccessMessage('user_subscriptions.deleted'));
   });
}
