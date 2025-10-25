# Centralized Message Management

## Overview

The AudioBook API now uses a centralized message management system for better code modularity, maintainability, and future internationalization support.

## Files Created

### 1. `src/config/messages.yaml`

Centralized YAML file containing all response messages, validation rules, and API information.

### 2. `src/utils/MessageHandler.ts`

TypeScript utility class for loading and formatting messages with template variable support.

## Usage Examples

### Basic Message Retrieval

```typescript
import { MessageHandler } from "../utils/MessageHandler";

// Get success message
const message = MessageHandler.getSuccessMessage("audiobooks.retrieved");
// Returns: "AudioBooks retrieved successfully"

// Get error message
const errorMessage = MessageHandler.getErrorMessage("validation.page_positive");
// Returns: "Page must be a positive integer"
```

### Message with Template Variables

```typescript
// Get message with variables
const message = MessageHandler.getSuccessMessage("audiobooks.by_genre", {
  genre: "Fiction",
});
// Returns: "AudioBooks in genre "Fiction" retrieved successfully"

const errorMessage = MessageHandler.getErrorMessage("validation.sort_field", {
  fields: "title, author, createdAt",
});
// Returns: "Sort field must be one of: title, author, createdAt"
```

### API Information

```typescript
// Get API information
const title = MessageHandler.getApiInfo("info.title");
// Returns: "AudioBook API Server"

const endpoints = MessageHandler.getApiInfo("info.endpoints");
// Returns: { health: "/api/health", audiobooks: "/api/v1/audiobooks", docs: "/api/docs" }
```

### Validation Rules

```typescript
// Get validation rules
const maxLimit = MessageHandler.getValidationRule("pagination.max_limit");
// Returns: 100

const allowedSortFields = MessageHandler.getValidationRule(
  "sort_fields.allowed"
);
// Returns: ["title", "author", "createdAt", "updatedAt", "duration"]
```

## Benefits

### 1. **Centralized Management**

- All messages in one place
- Easy to update and maintain
- Consistent messaging across the API

### 2. **Template Support**

- Dynamic message formatting with variables
- Flexible message construction
- Reduced code duplication

### 3. **Type Safety**

- TypeScript interfaces for all message structures
- Compile-time validation of message keys
- IntelliSense support for message paths

### 4. **Internationalization Ready**

- Easy to add multiple language support
- Structured for translation tools
- Fallback to default messages

### 5. **Validation Rules**

- Centralized validation configuration
- Easy to modify limits and rules
- Consistent validation across endpoints

## Message Categories

### Success Messages

- `audiobooks.*` - AudioBook operation success messages
- `general.*` - General success messages

### Error Messages

- `validation.*` - Input validation errors
- `not_found.*` - Resource not found errors
- `conflict.*` - Resource conflict errors
- `unauthorized.*` - Authentication errors
- `forbidden.*` - Authorization errors
- `internal.*` - Internal server errors

### API Information

- `info.*` - API metadata and configuration

### Validation Rules

- `pagination.*` - Pagination limits and defaults
- `sort_fields.*` - Allowed sort fields
- `string_fields.*` - String field constraints
- `isbn.*` - ISBN format specifications

## Development Features

### Hot Reloading

```typescript
// Reload messages during development
MessageHandler.reloadMessages();
```

### Fallback Messages

If the YAML file fails to load, the system automatically falls back to hardcoded default messages to ensure the API continues to function.

### Error Handling

- Graceful handling of missing message keys
- Console warnings for debugging
- Fallback to generic messages

## Future Enhancements

1. **Multi-language Support**: Easy to extend with language-specific YAML files
2. **Message Caching**: Optional caching for better performance
3. **Dynamic Loading**: Load messages from external sources
4. **Message Analytics**: Track which messages are used most frequently
5. **A/B Testing**: Support for different message variants

This centralized approach significantly improves code maintainability and provides a solid foundation for future internationalization and customization needs.
