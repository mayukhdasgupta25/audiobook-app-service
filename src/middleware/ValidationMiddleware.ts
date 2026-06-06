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
    const { genre, language, author, narrator, isActive, isPublic, search, moodId, moodIds } = req.query;

    const cuidRegex = /^c[a-z0-9]{24}$/;
    const moodIdValues: string[] = [];

    if (moodId !== undefined) {
      if (typeof moodId !== 'string' || !cuidRegex.test(moodId)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_format'));
        return;
      }
      moodIdValues.push(moodId);
    }

    if (moodIds !== undefined) {
      const rawMoodIds = Array.isArray(moodIds)
        ? moodIds
        : typeof moodIds === 'string'
          ? moodIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0)
          : [];

      for (const id of rawMoodIds) {
        if (typeof id !== 'string' || !cuidRegex.test(id)) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_format'));
          return;
        }
        moodIdValues.push(id);
      }
    }

    if (moodIdValues.length > 0) {
      req.query['moodIds'] = moodIdValues.join(',');
      delete req.query['moodId'];
    }

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
    const { id, audiobookId } = req.params;

    if (!id && !audiobookId) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_required'));
      return;
    }

    // CUID format validation (used by Prisma)
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (!cuidRegex.test(id!) && !cuidRegex.test(audiobookId!)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_format'));
      return;
    }

    next();
  }

  /**
   * Validate userProfileId path parameter (CUID)
   */
  static validateUserProfileIdParam(req: Request, res: Response, next: NextFunction): void {
    const { userProfileId } = req.params;

    if (!userProfileId || typeof userProfileId !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.user_profile_id_required'));
      return;
    }

    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (!cuidRegex.test(userProfileId)) {
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

    // Cover image and audio file are validated by UploadMiddleware.handleImageAndAudioUpload
    // No need to validate here as middleware ensures both are present

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
    const {
      username,
      firstName,
      lastName,
      avatar,
      gender,
      location,
      age,
      preferences,
    } = req.body;

    // Ensure only expected fields are present
    const allowedFields = [
      'username',
      'firstName',
      'lastName',
      'avatar',
      'gender',
      'location',
      'age',
      'preferences',
    ];
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

    // Validate gender if provided (null clears the field)
    if (gender !== undefined) {
      if (gender !== null && typeof gender !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.gender_invalid'));
        return;
      }
      const validGenders = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'];
      if (gender !== null && !validGenders.includes(gender)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.gender_invalid'));
        return;
      }
    }

    // Validate location coordinates (resolved to a location string in controller); null clears the field
    if (location !== undefined) {
      if (location === null) {
        // pass through — clears stored location
      } else if (typeof location === 'object' && !Array.isArray(location)) {
        const { latitude, longitude } = location as { latitude?: unknown; longitude?: unknown };
        const hasLatitude = latitude !== undefined && latitude !== null && latitude !== '';
        const hasLongitude = longitude !== undefined && longitude !== null && longitude !== '';

        if (hasLatitude !== hasLongitude) {
          ResponseHandler.validationError(
            res,
            MessageHandler.getErrorMessage('validation.coordinates_required_together')
          );
          return;
        }

        const parsedLatitude = ValidationMiddleware.parseCoordinate(latitude);
        if (parsedLatitude === null || parsedLatitude < -90 || parsedLatitude > 90) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.latitude_invalid'));
          return;
        }

        const parsedLongitude = ValidationMiddleware.parseCoordinate(longitude);
        if (parsedLongitude === null || parsedLongitude < -180 || parsedLongitude > 180) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.longitude_invalid'));
          return;
        }

        req.body.location = { latitude: parsedLatitude, longitude: parsedLongitude };
      } else {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.location_invalid'));
        return;
      }
    }

    // Validate age if provided (null clears the field)
    if (age !== undefined) {
      if (age !== null && (!Number.isInteger(age) || age < 1 || age > 150)) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.age_invalid'));
        return;
      }
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
    if (
      [username, firstName, lastName, avatar, gender, location, age, preferences].every(
        v => v === undefined
      )
    ) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.no_update_fields'));
      return;
    }

    next();
  }

  /** Parses latitude/longitude sent as string or number; returns null when invalid. */
  private static parseCoordinate(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
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

  /**
   * Validate UserAudioBook creation request
   */
  static validateUserAudioBookCreation(req: Request, res: Response, next: NextFunction): void {
    const { userProfileId, audiobookId, type } = req.body;

    if (type !== undefined) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.user_audiobook_type_not_settable'));
      return;
    }

    // Validate required fields
    if (!userProfileId || typeof userProfileId !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.user_profile_id_required'));
      return;
    }

    // Validate CUID format for userProfileId
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (!cuidRegex.test(userProfileId)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_format'));
      return;
    }

    if (!audiobookId || typeof audiobookId !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.audiobook_id_required'));
      return;
    }

    // Validate CUID format for audiobookId
    if (!cuidRegex.test(audiobookId)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.id_format'));
      return;
    }

    next();
  }

  /**
   * Validate UserAudioBook type parameter
   */
  static validateUserAudioBookType(req: Request, res: Response, next: NextFunction): void {
    const { type } = req.params;

    if (!type || !['OWNED', 'PURCHASED'].includes(type)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.user_audiobook_type_invalid'));
      return;
    }

    next();
  }

  /**
   * Validate tag creation request
   */
  static validateCreateTag(req: Request, res: Response, next: NextFunction): void {
    const { name } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_name_required'));
      return;
    }

    // Validate name is not empty after trimming
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_name_empty'));
      return;
    }

    // Validate name length (max 100 characters)
    const maxLength = 100;
    if (trimmedName.length > maxLength) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_name_too_long', { maxLength }));
      return;
    }

    // Sanitize name by trimming
    req.body.name = trimmedName;

    next();
  }

  /**
   * Validate tag update request
   */
  static validateUpdateTag(req: Request, res: Response, next: NextFunction): void {
    const { name } = req.body;

    // Name is optional for update, but if provided must be valid
    if (name !== undefined) {
      if (typeof name !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_name_invalid'));
        return;
      }

      // Validate name is not empty after trimming
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_name_empty'));
        return;
      }

      // Validate name length (max 100 characters)
      const maxLength = 100;
      if (trimmedName.length > maxLength) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.tag_name_too_long', { maxLength }));
        return;
      }

      // Sanitize name by trimming
      req.body.name = trimmedName;
    } else {
      // Must have at least one field to update
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.no_update_fields'));
      return;
    }

    next();
  }

  /**
   * Validate mood creation request
   */
  static validateCreateMood(req: Request, res: Response, next: NextFunction): void {
    const { name, description, descriptionIcon, hexcode, icon, attributes } = req.body;

    if (!name || typeof name !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_name_required'));
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_name_empty'));
      return;
    }

    const maxNameLength = 100;
    if (trimmedName.length > maxNameLength) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_name_too_long', { maxLength: maxNameLength }));
      return;
    }

    if (!hexcode || typeof hexcode !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_hexcode_required'));
      return;
    }

    const trimmedHexcode = hexcode.trim();
    if (trimmedHexcode.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_hexcode_empty'));
      return;
    }

    if (!icon || typeof icon !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_icon_required'));
      return;
    }

    const trimmedIcon = icon.trim();
    if (trimmedIcon.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_icon_empty'));
      return;
    }

    const maxIconLength = 100;
    if (trimmedIcon.length > maxIconLength) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_icon_too_long', { maxLength: maxIconLength }));
      return;
    }

    if (!descriptionIcon || typeof descriptionIcon !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_icon_required'));
      return;
    }

    const trimmedDescriptionIcon = descriptionIcon.trim();
    if (trimmedDescriptionIcon.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_icon_empty'));
      return;
    }

    if (trimmedDescriptionIcon.length > maxIconLength) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_icon_too_long', { maxLength: maxIconLength }));
      return;
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_invalid'));
      return;
    }

    if (typeof description === 'string') {
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 500) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_too_long', { maxLength: 500 }));
        return;
      }
      req.body.description = trimmedDescription.length > 0 ? trimmedDescription : null;
    }

    if (attributes !== undefined && !ValidationMiddleware.validateMoodAttributes(req, res, attributes)) {
      return;
    }

    req.body.name = trimmedName;
    req.body.hexcode = trimmedHexcode;
    req.body.icon = trimmedIcon;
    req.body.descriptionIcon = trimmedDescriptionIcon;

    next();
  }

  /**
   * Validate mood update request
   */
  static validateUpdateMood(req: Request, res: Response, next: NextFunction): void {
    const { name, description, descriptionIcon, hexcode, icon, attributes } = req.body;

    if (
      name === undefined &&
      description === undefined &&
      descriptionIcon === undefined &&
      hexcode === undefined &&
      icon === undefined &&
      attributes === undefined
    ) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.no_update_fields'));
      return;
    }

    if (name !== undefined) {
      if (typeof name !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_name_invalid'));
        return;
      }

      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_name_empty'));
        return;
      }

      const maxNameLength = 100;
      if (trimmedName.length > maxNameLength) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_name_too_long', { maxLength: maxNameLength }));
        return;
      }

      req.body.name = trimmedName;
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_invalid'));
        return;
      }

      if (typeof description === 'string') {
        const trimmedDescription = description.trim();
        if (trimmedDescription.length > 500) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_too_long', { maxLength: 500 }));
          return;
        }
        req.body.description = trimmedDescription.length > 0 ? trimmedDescription : null;
      }
    }

    if (descriptionIcon !== undefined) {
      if (typeof descriptionIcon !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_icon_invalid'));
        return;
      }

      const trimmedDescriptionIcon = descriptionIcon.trim();
      if (trimmedDescriptionIcon.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_icon_empty'));
        return;
      }

      const maxIconLength = 100;
      if (trimmedDescriptionIcon.length > maxIconLength) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_description_icon_too_long', { maxLength: maxIconLength }));
        return;
      }

      req.body.descriptionIcon = trimmedDescriptionIcon;
    }

    if (hexcode !== undefined) {
      if (typeof hexcode !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_hexcode_invalid'));
        return;
      }

      const trimmedHexcode = hexcode.trim();
      if (trimmedHexcode.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_hexcode_empty'));
        return;
      }

      req.body.hexcode = trimmedHexcode;
    }

    if (icon !== undefined) {
      if (typeof icon !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_icon_invalid'));
        return;
      }

      const trimmedIcon = icon.trim();
      if (trimmedIcon.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_icon_empty'));
        return;
      }

      const maxIconLength = 100;
      if (trimmedIcon.length > maxIconLength) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_icon_too_long', { maxLength: maxIconLength }));
        return;
      }

      req.body.icon = trimmedIcon;
    }

    if (attributes !== undefined && !ValidationMiddleware.validateMoodAttributes(req, res, attributes)) {
      return;
    }

    next();
  }

  private static validateMoodAttributes(req: Request, res: Response, attributes: unknown): boolean {
    if (!Array.isArray(attributes)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attributes_invalid'));
      return false;
    }

    const maxIconLength = 100;
    const maxDescriptionLength = 500;
    const sanitizedAttributes: Array<{ icon: string; description: string }> = [];

    for (const attribute of attributes) {
      if (!attribute || typeof attribute !== 'object') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attribute_invalid'));
        return false;
      }

      const { icon, description } = attribute as { icon?: unknown; description?: unknown };

      if (!icon || typeof icon !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attribute_icon_required'));
        return false;
      }

      const trimmedIcon = icon.trim();
      if (trimmedIcon.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attribute_icon_empty'));
        return false;
      }

      if (trimmedIcon.length > maxIconLength) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attribute_icon_too_long', { maxLength: maxIconLength }));
        return false;
      }

      if (!description || typeof description !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attribute_description_required'));
        return false;
      }

      const trimmedDescription = description.trim();
      if (trimmedDescription.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attribute_description_empty'));
        return false;
      }

      if (trimmedDescription.length > maxDescriptionLength) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.mood_attribute_description_too_long', { maxLength: maxDescriptionLength }));
        return false;
      }

      sanitizedAttributes.push({
        icon: trimmedIcon,
        description: trimmedDescription
      });
    }

    req.body.attributes = sanitizedAttributes;
    return true;
  }

  /**
   * Validate author creation request
   */
  static validateCreateAuthor(req: Request, res: Response, next: NextFunction): void {
    const { firstName, lastName, email, address, contact } = req.body;

    // Validate required fields
    if (!firstName || typeof firstName !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_first_name_required'));
      return;
    }

    const trimmedFirstName = firstName.trim();
    if (trimmedFirstName.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_first_name_required'));
      return;
    }

    if (trimmedFirstName.length > 100) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_first_name_too_long'));
      return;
    }

    if (!lastName || typeof lastName !== 'string') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_last_name_required'));
      return;
    }

    const trimmedLastName = lastName.trim();
    if (trimmedLastName.length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_last_name_required'));
      return;
    }

    if (trimmedLastName.length > 100) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_last_name_too_long'));
      return;
    }

    // Validate email format if provided
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.email_format'));
        return;
      }

      const trimmedEmail = email.trim();
      if (trimmedEmail.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.email_format'));
          return;
        }

        if (trimmedEmail.length > 255) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.email_too_long'));
          return;
        }
      }
    }

    // Validate address length if provided
    if (address !== undefined && address !== null && address !== '') {
      if (typeof address !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_address_invalid'));
        return;
      }

      const trimmedAddress = address.trim();
      if (trimmedAddress.length > 500) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_address_too_long'));
        return;
      }
    }

    // Validate contact length if provided
    if (contact !== undefined && contact !== null && contact !== '') {
      if (typeof contact !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_contact_invalid'));
        return;
      }

      const trimmedContact = contact.trim();
      if (trimmedContact.length > 50) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_contact_too_long'));
        return;
      }
    }

    // Sanitize and set trimmed values
    req.body.firstName = trimmedFirstName;
    req.body.lastName = trimmedLastName;
    if (email !== undefined && email !== null && email !== '') {
      req.body.email = email.trim();
    }
    if (address !== undefined && address !== null && address !== '') {
      req.body.address = address.trim();
    }
    if (contact !== undefined && contact !== null && contact !== '') {
      req.body.contact = contact.trim();
    }

    next();
  }

  /**
   * Validate author update request
   */
  static validateUpdateAuthor(req: Request, res: Response, next: NextFunction): void {
    const { firstName, lastName, email, address, contact } = req.body;

    // All fields are optional for update, but if provided must be valid

    if (firstName !== undefined) {
      if (typeof firstName !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_first_name_invalid'));
        return;
      }

      const trimmed = firstName.trim();
      if (trimmed.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_first_name_required'));
        return;
      }

      if (trimmed.length > 100) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_first_name_too_long'));
        return;
      }

      req.body.firstName = trimmed;
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_last_name_invalid'));
        return;
      }

      const trimmed = lastName.trim();
      if (trimmed.length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_last_name_required'));
        return;
      }

      if (trimmed.length > 100) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_last_name_too_long'));
        return;
      }

      req.body.lastName = trimmed;
    }

    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.email_format'));
        return;
      }

      const trimmedEmail = email.trim();
      if (trimmedEmail.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.email_format'));
          return;
        }

        if (trimmedEmail.length > 255) {
          ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.email_too_long'));
          return;
        }
      }

      req.body.email = trimmedEmail;
    }

    if (address !== undefined && address !== null && address !== '') {
      if (typeof address !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_address_invalid'));
        return;
      }

      const trimmedAddress = address.trim();
      if (trimmedAddress.length > 500) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_address_too_long'));
        return;
      }

      req.body.address = trimmedAddress;
    }

    if (contact !== undefined && contact !== null && contact !== '') {
      if (typeof contact !== 'string') {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_contact_invalid'));
        return;
      }

      const trimmedContact = contact.trim();
      if (trimmedContact.length > 50) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.author_contact_too_long'));
        return;
      }

      req.body.contact = trimmedContact;
    }

    // Must have at least one field to update
    if ([firstName, lastName, email, address, contact, req.body.organizationIds].every(v => v === undefined)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.no_update_fields'));
      return;
    }

    next();
  }

  private static validateCommentMetaField(
    res: Response,
    meta: unknown,
    required: boolean
  ): boolean {
    if (meta === undefined || meta === null) {
      if (required) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_meta_invalid'));
        return false;
      }
      return true;
    }
    if (typeof meta !== 'object' || Array.isArray(meta)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_meta_invalid'));
      return false;
    }
    const obj = meta as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length !== 1 || !keys.includes('position')) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_meta_invalid'));
      return false;
    }
    if ('chapterId' in obj) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_meta_chapter_forbidden'));
      return false;
    }
    if (typeof obj['position'] !== 'number' || !Number.isFinite(obj['position']) || obj['position'] < 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_meta_position_invalid'));
      return false;
    }
    return true;
  }

  static validateCreateComment(req: Request, res: Response, next: NextFunction): void {
    const { audiobookId, content, meta } = req.body;

    if (!audiobookId || typeof audiobookId !== 'string' || audiobookId.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.audiobook_id_required'));
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_content_required'));
      return;
    }

    if (req.body.parentId !== undefined && req.body.parentId !== null) {
      if (typeof req.body.parentId !== 'string' || req.body.parentId.trim().length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_parent_invalid'));
        return;
      }
    }

    if (!ValidationMiddleware.validateCommentMetaField(res, meta, false)) {
      return;
    }

    req.body.content = content.trim();
    next();
  }

  static validateUpdateComment(req: Request, res: Response, next: NextFunction): void {
    const { content, meta } = req.body;

    if (content === undefined && meta === undefined) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.no_update_fields'));
      return;
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.comment_content_required'));
        return;
      }
      req.body.content = content.trim();
    }

    if (meta !== undefined && !ValidationMiddleware.validateCommentMetaField(res, meta, meta !== null)) {
      return;
    }

    next();
  }

  static validateCreateReview(req: Request, res: Response, next: NextFunction): void {
    const { audiobookId, rating } = req.body;

    if (!audiobookId || typeof audiobookId !== 'string' || audiobookId.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.audiobook_id_required'));
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.review_rating_invalid'));
      return;
    }

    next();
  }

  static validateUpdateReview(req: Request, res: Response, next: NextFunction): void {
    const { rating } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.review_rating_invalid'));
      return;
    }

    next();
  }

  static validateCreateBookmark(req: Request, res: Response, next: NextFunction): void {
    const { chapterId, audiobookId } = req.body;

    if (audiobookId !== undefined) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.bookmark_audiobook_id_forbidden'));
      return;
    }

    if (!chapterId || typeof chapterId !== 'string' || chapterId.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.chapter_id_required'));
      return;
    }

    req.body.chapterId = chapterId.trim();
    next();
  }

  static validateCreateFavorite(req: Request, res: Response, next: NextFunction): void {
    const { audiobookId } = req.body;

    if (!audiobookId || typeof audiobookId !== 'string' || audiobookId.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.audiobook_id_required'));
      return;
    }

    next();
  }

  static validateCreatePlaylist(req: Request, res: Response, next: NextFunction): void {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.playlist_name_required'));
      return;
    }

    if (name.trim().length > 200) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.playlist_name_too_long'));
      return;
    }

    req.body.name = name.trim();
    next();
  }

  static validateUpdatePlaylist(req: Request, res: Response, next: NextFunction): void {
    const { name, description, isPublic } = req.body;

    if (name === undefined && description === undefined && isPublic === undefined) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.no_update_fields'));
      return;
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.playlist_name_required'));
        return;
      }
      if (name.trim().length > 200) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.playlist_name_too_long'));
        return;
      }
      req.body.name = name.trim();
    }

    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.is_public_boolean'));
      return;
    }

    next();
  }

  static validateCreatePlaylistItem(req: Request, res: Response, next: NextFunction): void {
    const { audiobookId, position } = req.body;

    if (!audiobookId || typeof audiobookId !== 'string' || audiobookId.trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.audiobook_id_required'));
      return;
    }

    if (position !== undefined && (!Number.isInteger(position) || position < 1)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.playlist_item_position_invalid'));
      return;
    }

    next();
  }

  static validateUpdatePlaylistItem(req: Request, res: Response, next: NextFunction): void {
    const { position } = req.body;

    if (!Number.isInteger(position) || position < 1) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.playlist_item_position_invalid'));
      return;
    }

    next();
  }

  private static validateOrganizationIds(
    res: Response,
    organizationIds: unknown
  ): organizationIds is string[] {
    if (organizationIds === undefined) {
      return true;
    }
    if (!Array.isArray(organizationIds)) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.organization_ids_invalid'));
      return false;
    }
    for (const id of organizationIds) {
      if (typeof id !== 'string' || id.trim().length === 0) {
        ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.organization_ids_invalid'));
        return false;
      }
    }
    return true;
  }

  static validateAuthorOrganizationIds(req: Request, res: Response, next: NextFunction): void {
    if (!ValidationMiddleware.validateOrganizationIds(res, req.body.organizationIds)) {
      return;
    }
    next();
  }
}
