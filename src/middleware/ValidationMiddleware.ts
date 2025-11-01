/**
 * Validation middleware for request parameters
 * Provides type-safe validation following OOP principles
 */
import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../utils/ResponseHandler';
import { MessageHandler } from '../utils/MessageHandler';

export class ValidationMiddleware {
  /**
   * Validate pagination parameters
   */
  static validatePagination(req: Request, res: Response, next: NextFunction): void {
    const { page, limit, sortBy, sortOrder } = req.query;

    // Validate page parameter
    if (page !== undefined) {
      const pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.page_positive'));
        return;
      }
    }

    // Validate limit parameter
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.limit_range'));
        return;
      }
    }

    // Validate sortBy parameter
    if (sortBy !== undefined) {
      const allowedSortFields = MessageHandler.getValidationRule('sort_fields.allowed');
      if (!allowedSortFields.includes(sortBy as string)) {
        ResponseHandler.validationError(
          res,
          MessageHandler.getErrorMessage('validation.sort_field', { fields: allowedSortFields.join(', ') })
        );
        return;
      }
    }

    // Validate sortOrder parameter
    if (sortOrder !== undefined) {
      if (!['asc', 'desc'].includes(sortOrder as string)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.sort_order'));
        return;
      }
    }

    next();
  }

  /**
   * Validate audiobook filter parameters
   */
  static validateAudioBookFilters(req: Request, res: Response, next: NextFunction): void {
    const { genre, language, author, narrator, isActive, isPublic, search } = req.query;

    // Validate boolean parameters
    if (isActive !== undefined) {
      if (!['true', 'false'].includes(isActive as string)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.is_active_boolean'));
        return;
      }
    }

    if (isPublic !== undefined) {
      if (!['true', 'false'].includes(isPublic as string)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.is_public_boolean'));
        return;
      }
    }

    // Validate string parameters length
    const maxLength = MessageHandler.getValidationRule('string_fields.max_length');
    const stringParams = { genre, language, author, narrator, search };
    for (const [key, value] of Object.entries(stringParams)) {
      if (value !== undefined && typeof value === 'string' && value.length > maxLength) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.string_length', { field: key }));
        return;
      }
    }

    next();
  }

  /**
   * Validate MongoDB ObjectId format (if using MongoDB) or CUID format
   */
  static validateId(req: Request, res: Response, next: NextFunction): void {
    const { id } = req.params;

    if (!id) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_required'));
      return;
    }

    // CUID format validation (used by Prisma)
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (!cuidRegex.test(id)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_format'));
      return;
    }

    next();
  }

  /**
   * Validate tag parameters for audiobook filtering
   */
  static validateTags(req: Request, res: Response, next: NextFunction): void {
    const { tags } = req.params;

    if (!tags || typeof tags !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tags_required'));
      return;
    }

    // Parse comma-separated tags
    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    if (tagList.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tags_required'));
      return;
    }

    // Validate each tag (basic validation - alphanumeric, spaces, hyphens, underscores)
    const tagRegex = /^[a-zA-Z0-9\s\-_]+$/;
    for (const tag of tagList) {
      if (!tagRegex.test(tag)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_format', { tag }));
        return;
      }
      if (tag.length > 50) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_length', { tag }));
        return;
      }
    }

    // Limit number of tags
    if (tagList.length > 10) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tags_limit'));
      return;
    }

    // Store parsed tags in request for controller use
    (req as any).parsedTags = tagList;

    next();
  }

  /**
   * Validate chapter ID parameter
   */
  static validateChapterId(req: Request, res: Response, next: NextFunction): void {
    const { chapterId } = req.params;

    if (!chapterId) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.chapter_id_required'));
      return;
    }

    // CUID format validation
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (!cuidRegex.test(chapterId)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.chapter_id_format'));
      return;
    }

    next();
  }

  /**
   * Validate bitrate parameter
   */
  static validateBitrate(req: Request, res: Response, next: NextFunction): void {
    const { bitrate } = req.params;

    if (!bitrate) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bitrate_required'));
      return;
    }

    const bitrateNum = parseInt(bitrate, 10);
    if (isNaN(bitrateNum) || bitrateNum < 32 || bitrateNum > 512) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bitrate_range'));
      return;
    }

    next();
  }

  /**
   * Validate segment ID parameter
   */
  static validateSegmentId(req: Request, res: Response, next: NextFunction): void {
    const { segmentId } = req.params;

    if (!segmentId) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.segment_id_required'));
      return;
    }

    // Validate segment ID format (e.g., segment_001.ts)
    const segmentRegex = /^segment_\d{3}\.ts$/;
    if (!segmentRegex.test(segmentId)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.segment_id_format'));
      return;
    }

    next();
  }

  /**
   * Validate transcoding request body
   */
  static validateTranscodingRequest(req: Request, res: Response, next: NextFunction): void {
    const { bitrates, priority } = req.body;

    // Validate bitrates array
    if (bitrates !== undefined) {
      if (!Array.isArray(bitrates)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bitrates_array'));
        return;
      }

      for (const bitrate of bitrates) {
        if (typeof bitrate !== 'number' || bitrate < 32 || bitrate > 512) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bitrate_range'));
          return;
        }
      }

      if (bitrates.length > 5) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bitrates_limit'));
        return;
      }
    }

    // Validate priority
    if (priority !== undefined) {
      if (!['low', 'normal', 'high'].includes(priority)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.priority_value'));
        return;
      }
    }

    next();
  }

  /**
   * Validate preload request body
   */
  static validatePreloadRequest(req: Request, res: Response, next: NextFunction): void {
    const { bitrate } = req.body;

    if (bitrate !== undefined) {
      if (typeof bitrate !== 'number' || bitrate < 32 || bitrate > 512) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bitrate_range'));
        return;
      }
    }

    next();
  }

  /**
   * Validate chapter creation request
   */
  static validateChapterCreation(req: Request, res: Response, next: NextFunction): void {
    const { audiobookId, title, chapterNumber, duration, startPosition, endPosition } = req.body;

    // Validate required fields
    if (!audiobookId) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.audiobook_id_required'));
      return;
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.title_required'));
      return;
    }

    if (title.length > 200) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.title_length'));
      return;
    }

    // Parse and validate numeric fields (they come as strings from form-data)
    const chapterNumberNum = parseInt(chapterNumber, 10);
    if (!chapterNumber || isNaN(chapterNumberNum) || chapterNumberNum < 1) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.chapter_number_positive'));
      return;
    }

    const durationNum = parseInt(duration, 10);
    if (!duration || isNaN(durationNum) || durationNum < 1) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.duration_positive'));
      return;
    }

    const startPositionNum = parseInt(startPosition, 10);
    if (!startPosition || isNaN(startPositionNum) || startPositionNum < 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.start_position_non_negative'));
      return;
    }

    const endPositionNum = parseInt(endPosition, 10);
    if (!endPosition || isNaN(endPositionNum) || endPositionNum <= startPositionNum) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.end_position_greater'));
      return;
    }

    // Validate description if provided
    if (req.body.description && (typeof req.body.description !== 'string' || req.body.description.length > 1000)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.description_length'));
      return;
    }

    next();
  }

  /**
   * Validate user profile update request
   */
  static validateUserProfileUpdate(req: Request, res: Response, next: NextFunction): void {
    const { username, firstName, lastName, avatar, preferences } = req.body;

    // Ensure only expected fields are present
    const allowedFields = ['username', 'firstName', 'lastName', 'avatar', 'preferences'];
    const extraFields = Object.keys(req.body).filter(k => !allowedFields.includes(k));
    if (extraFields.length > 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.unexpected_fields'));
      return;
    }

    // Validate username
    if (username !== undefined) {
      if (typeof username !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.username_type'));
        return;
      }
      const trimmed = username.trim();
      if (trimmed.length < 3 || trimmed.length > 30) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.username_length'));
        return;
      }
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(trimmed)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.username_format'));
        return;
      }
      req.body.username = trimmed;
    }

    // Validate firstName and lastName
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 50) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.first_name'));
        return;
      }
      req.body.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 50) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.last_name'));
        return;
      }
      req.body.lastName = lastName.trim();
    }

    // Validate avatar URL if provided
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length > 500) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.avatar_url'));
        return;
      }
      try {
        // Basic URL validation
        new URL(avatar);
      } catch {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.avatar_url'));
        return;
      }
    }

    // Validate preferences object
    if (preferences !== undefined) {
      if (typeof preferences !== 'object' || Array.isArray(preferences)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.preferences_object'));
        return;
      }
    }

    // Must have at least one updatable field
    if ([username, firstName, lastName, avatar, preferences].every(v => v === undefined)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.no_update_fields'));
      return;
    }

    next();
  }

  /**
   * Sanitize and normalize query parameters
   */
  static sanitizeQueryParams(req: Request, _res: Response, next: NextFunction): void {
    // Sanitize string parameters
    const stringFields = ['genre', 'language', 'author', 'narrator', 'search', 'sortBy'];

    for (const field of stringFields) {
      if (req.query[field]) {
        req.query[field] = (req.query[field] as string).trim();
      }
    }

    // Convert string booleans to actual booleans
    if (req.query['isActive']) {
      (req.query as any)['isActive'] = req.query['isActive'] === 'true';
    }
    if (req.query['isPublic']) {
      (req.query as any)['isPublic'] = req.query['isPublic'] === 'true';
    }

    // Convert string numbers to actual numbers
    if (req.query['page']) {
      (req.query as any)['page'] = parseInt(req.query['page'] as string, 10);
    }
    if (req.query['limit']) {
      (req.query as any)['limit'] = parseInt(req.query['limit'] as string, 10);
    }

    next();
  }
}
