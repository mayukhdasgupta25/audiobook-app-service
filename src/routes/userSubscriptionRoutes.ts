/**
 * User Subscription Routes
 * Handles HTTP endpoints for managing per-user subscriptions.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { UserSubscriptionController } from '../controllers/UserSubscriptionController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { ResponseHandler } from '../utils/ResponseHandler';

const CUID_REGEX = /^c[a-z0-9]{24}$/;
const ALLOWED_STATUSES: SubscriptionStatus[] = [
   'PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED'
] as SubscriptionStatus[];

function validateCreateSubscription(req: Request, res: Response, next: NextFunction): void {
   const { userProfileId, planId, autoRenew, paymentMethod, startTrial } = req.body || {};
   if (!planId || typeof planId !== 'string' || !CUID_REGEX.test(planId)) {
      ResponseHandler.validationError(res, 'planId must be a valid CUID');
      return;
   }
   if (userProfileId !== undefined && (typeof userProfileId !== 'string' || !CUID_REGEX.test(userProfileId))) {
      ResponseHandler.validationError(res, 'userProfileId must be a valid CUID');
      return;
   }
   if (autoRenew !== undefined && typeof autoRenew !== 'boolean') {
      ResponseHandler.validationError(res, 'autoRenew must be a boolean');
      return;
   }
   if (paymentMethod !== undefined && (typeof paymentMethod !== 'string' || paymentMethod.length > 100)) {
      ResponseHandler.validationError(res, 'paymentMethod must be a string up to 100 characters');
      return;
   }
   if (startTrial !== undefined && typeof startTrial !== 'boolean') {
      ResponseHandler.validationError(res, 'startTrial must be a boolean');
      return;
   }
   next();
}

function validateUpdateSubscription(req: Request, res: Response, next: NextFunction): void {
   const { autoRenew, paymentMethod, cancelAtPeriodEnd, status } = req.body || {};
   const allowed = ['autoRenew', 'paymentMethod', 'cancelAtPeriodEnd', 'status'];
   const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
   if (extra.length > 0) {
      ResponseHandler.validationError(res, `Unexpected fields: ${extra.join(', ')}`);
      return;
   }
   if (Object.keys(req.body || {}).length === 0) {
      ResponseHandler.validationError(res, 'At least one field must be provided for update');
      return;
   }
   if (autoRenew !== undefined && typeof autoRenew !== 'boolean') {
      ResponseHandler.validationError(res, 'autoRenew must be a boolean');
      return;
   }
   if (paymentMethod !== undefined && paymentMethod !== null && (typeof paymentMethod !== 'string' || paymentMethod.length > 100)) {
      ResponseHandler.validationError(res, 'paymentMethod must be a string up to 100 characters');
      return;
   }
   if (cancelAtPeriodEnd !== undefined && typeof cancelAtPeriodEnd !== 'boolean') {
      ResponseHandler.validationError(res, 'cancelAtPeriodEnd must be a boolean');
      return;
   }
   if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      ResponseHandler.validationError(res, `status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
      return;
   }
   next();
}

function validateChangePlan(req: Request, res: Response, next: NextFunction): void {
   const { planId } = req.body || {};
   if (!planId || typeof planId !== 'string' || !CUID_REGEX.test(planId)) {
      ResponseHandler.validationError(res, 'planId must be a valid CUID');
      return;
   }
   next();
}

function validateCancelBody(req: Request, res: Response, next: NextFunction): void {
   const { cancelAtPeriodEnd } = req.body || {};
   if (cancelAtPeriodEnd !== undefined && typeof cancelAtPeriodEnd !== 'boolean') {
      ResponseHandler.validationError(res, 'cancelAtPeriodEnd must be a boolean');
      return;
   }
   next();
}

function validateUserProfileIdParam(req: Request, res: Response, next: NextFunction): void {
   const { userProfileId } = req.params;
   if (!userProfileId || !CUID_REGEX.test(userProfileId)) {
      ResponseHandler.validationError(res, 'userProfileId must be a valid CUID');
      return;
   }
   next();
}

export function createUserSubscriptionRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new UserSubscriptionController(prisma);

   router.get(
      '/me',
      controller.getMySubscription
   );
   router.get(
      '/me/history',
      ValidationMiddleware.validatePagination,
      controller.getMySubscriptionHistory
   );

   router.get(
      '/user/:userProfileId',
      validateUserProfileIdParam,
      ValidationMiddleware.validatePagination,
      controller.getSubscriptionsByUser
   );

   router.get('/', ValidationMiddleware.validatePagination, controller.getAllSubscriptions);
   router.post('/', validateCreateSubscription, controller.createSubscription);

   router.post(
      '/:id/cancel',
      ValidationMiddleware.validateId,
      validateCancelBody,
      controller.cancelSubscription
   );
   router.post(
      '/:id/renew',
      ValidationMiddleware.validateId,
      controller.renewSubscription
   );

   router.patch(
      '/:id/plan',
      ValidationMiddleware.validateId,
      validateChangePlan,
      controller.changeSubscriptionPlan
   );

   router.get('/:id', ValidationMiddleware.validateId, controller.getSubscriptionById);
   router.put(
      '/:id',
      ValidationMiddleware.validateId,
      validateUpdateSubscription,
      controller.updateSubscription
   );
   router.delete('/:id', ValidationMiddleware.validateId, controller.deleteSubscription);

   return router;
}
