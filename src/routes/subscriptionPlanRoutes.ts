/**
 * Subscription Plan Routes
 * Handles HTTP endpoints for managing subscription plans (catalog).
 */
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, BillingInterval } from '@prisma/client';
import { SubscriptionPlanController } from '../controllers/SubscriptionPlanController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { ResponseHandler } from '../utils/ResponseHandler';

const ALLOWED_INTERVALS: BillingInterval[] = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME'] as BillingInterval[];

function validateCreatePlan(req: Request, res: Response, next: NextFunction): void {
   const { name, price, currency, billingInterval, trialDays, isActive, description } = req.body || {};

   if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      ResponseHandler.validationError(res, 'name must be a non-empty string up to 100 characters');
      return;
   }
   if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      ResponseHandler.validationError(res, 'price must be a non-negative number');
      return;
   }
   if (currency !== undefined && (typeof currency !== 'string' || currency.length < 3 || currency.length > 8)) {
      ResponseHandler.validationError(res, 'currency must be a 3-8 character ISO code');
      return;
   }
   if (billingInterval !== undefined && !ALLOWED_INTERVALS.includes(billingInterval)) {
      ResponseHandler.validationError(res, `billingInterval must be one of: ${ALLOWED_INTERVALS.join(', ')}`);
      return;
   }
   if (trialDays !== undefined && (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365)) {
      ResponseHandler.validationError(res, 'trialDays must be a non-negative integer up to 365');
      return;
   }
   if (isActive !== undefined && typeof isActive !== 'boolean') {
      ResponseHandler.validationError(res, 'isActive must be a boolean');
      return;
   }
   if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000)) {
      ResponseHandler.validationError(res, 'description must be a string up to 1000 characters');
      return;
   }
   req.body.name = name.trim();
   next();
}

function validateUpdatePlan(req: Request, res: Response, next: NextFunction): void {
   const { name, price, currency, billingInterval, trialDays, isActive, description } = req.body || {};
   const allowed = ['name', 'price', 'currency', 'billingInterval', 'trialDays', 'isActive', 'description', 'features'];
   const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
   if (extra.length > 0) {
      ResponseHandler.validationError(res, `Unexpected fields: ${extra.join(', ')}`);
      return;
   }
   if (Object.keys(req.body || {}).length === 0) {
      ResponseHandler.validationError(res, 'At least one field must be provided for update');
      return;
   }
   if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
         ResponseHandler.validationError(res, 'name must be a non-empty string up to 100 characters');
         return;
      }
      req.body.name = name.trim();
   }
   if (price !== undefined) {
      if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
         ResponseHandler.validationError(res, 'price must be a non-negative number');
         return;
      }
   }
   if (currency !== undefined && (typeof currency !== 'string' || currency.length < 3 || currency.length > 8)) {
      ResponseHandler.validationError(res, 'currency must be a 3-8 character ISO code');
      return;
   }
   if (billingInterval !== undefined && !ALLOWED_INTERVALS.includes(billingInterval)) {
      ResponseHandler.validationError(res, `billingInterval must be one of: ${ALLOWED_INTERVALS.join(', ')}`);
      return;
   }
   if (trialDays !== undefined && (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365)) {
      ResponseHandler.validationError(res, 'trialDays must be a non-negative integer up to 365');
      return;
   }
   if (isActive !== undefined && typeof isActive !== 'boolean') {
      ResponseHandler.validationError(res, 'isActive must be a boolean');
      return;
   }
   if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000)) {
      ResponseHandler.validationError(res, 'description must be a string up to 1000 characters');
      return;
   }
   next();
}

export function createSubscriptionPlanRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new SubscriptionPlanController(prisma);

   router.get('/', ValidationMiddleware.validatePagination, controller.getAllPlans);
   router.post('/', validateCreatePlan, controller.createPlan);
   router.get('/:id', ValidationMiddleware.validateId, controller.getPlanById);
   router.put('/:id', ValidationMiddleware.validateId, validateUpdatePlan, controller.updatePlan);
   router.delete('/:id', ValidationMiddleware.validateId, controller.deletePlan);

   return router;
}
