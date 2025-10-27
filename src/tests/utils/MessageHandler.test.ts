/**
 * MessageHandler Tests
 * Tests for message loading, formatting, and template variable replacement
 */

import fs from 'fs';
import yaml from 'js-yaml';
import { MessageHandler } from '../../utils/MessageHandler';

// Mock fs and yaml
jest.mock('fs');
jest.mock('js-yaml');

describe('MessageHandler', () => {
   beforeEach(() => {
      jest.clearAllMocks();
      // Reset the internal messages cache
      MessageHandler['reloadMessages']();
   });

   afterEach(() => {
      // Clean up after each test
      MessageHandler['reloadMessages']();
   });

   describe('Message Loading', () => {
      it('should load messages from YAML file successfully', () => {
         const mockYamlContent = `
success:
  audiobooks:
    retrieved: 'AudioBooks retrieved successfully'
errors:
  validation:
    page_positive: 'Page must be a positive integer'
`;
         (fs.readFileSync as jest.Mock).mockReturnValue(mockYamlContent);
         (yaml.load as jest.Mock).mockReturnValue({
            success: {
               audiobooks: {
                  retrieved: 'AudioBooks retrieved successfully',
               },
            },
            errors: {
               validation: {
                  page_positive: 'Page must be a positive integer',
               },
            },
         });

         const message = MessageHandler.getSuccessMessage('audiobooks.retrieved');

         expect(fs.readFileSync).toHaveBeenCalled();
         expect(yaml.load).toHaveBeenCalled();
         expect(message).toBe('AudioBooks retrieved successfully');
      });

      it('should fallback to default messages when YAML loading fails', () => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });

         const message = MessageHandler.getSuccessMessage('audiobooks.retrieved');

         expect(message).toBe('AudioBooks retrieved successfully');
      });

      it('should cache messages after first load', () => {
         (fs.readFileSync as jest.Mock).mockReturnValue('valid yaml');
         (yaml.load as jest.Mock).mockReturnValue({
            success: { audiobooks: { retrieved: 'Test' } },
         });

         // First call
         MessageHandler.getSuccessMessage('audiobooks.retrieved');
         // Second call
         MessageHandler.getSuccessMessage('audiobooks.retrieved');

         // Should only read file once due to caching
         expect(fs.readFileSync).toHaveBeenCalledTimes(1);
      });

      it('should reload messages when reloadMessages is called', () => {
         (fs.readFileSync as jest.Mock).mockReturnValue('valid yaml');
         (yaml.load as jest.Mock).mockReturnValue({
            success: { audiobooks: { retrieved: 'Test' } },
         });

         MessageHandler.getSuccessMessage('audiobooks.retrieved');
         MessageHandler.reloadMessages();
         MessageHandler.getSuccessMessage('audiobooks.retrieved');

         // Should be called twice (initial load + reload)
         expect(fs.readFileSync).toHaveBeenCalledTimes(2);
      });
   });

   describe('getSuccessMessage', () => {
      it('should retrieve success message for audiobooks', () => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
         const message = MessageHandler.getSuccessMessage('audiobooks.retrieved');
         expect(message).toBe('AudioBooks retrieved successfully');
      });

      it('should retrieve success message with template variables', () => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
         const message = MessageHandler.getSuccessMessage(
            'audiobooks.by_genre',
            { genre: 'Fantasy' }
         );
         expect(message).toContain('Fantasy');
         expect(message).toContain('retrieved successfully');
      });

      it('should handle multiple template variables', () => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
         const message = MessageHandler.getSuccessMessage(
            'audiobooks.by_author',
            { author: 'Stephen King' }
         );
         expect(message).toContain('Stephen King');
         expect(message).toContain('retrieved successfully');
      });

      it('should replace all occurrences of template variable', () => {
         const customMessage = MessageHandler['formatMessage'](
            '{key} and {key}',
            { key: 'value' }
         );
         expect(customMessage).toBe('value and value');
      });

      it('should return default message when key not found', () => {
         const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

         const message = MessageHandler.getSuccessMessage('nonexistent.key');

         expect(message).toBe('Success');
         expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Success message not found')
         );

         consoleWarnSpy.mockRestore();
      });

      it('should handle deep nested keys', () => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
         const message = MessageHandler.getSuccessMessage('general.health_check');
         expect(message).toBe('Service is healthy');
      });

      it('should handle missing template variables', () => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
         const message = MessageHandler.getSuccessMessage(
            'audiobooks.by_genre',
            {}
         );
         expect(message).toContain('{genre}');
      });
   });

   describe('getErrorMessage', () => {
      beforeEach(() => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
      });

      it('should retrieve validation error message', () => {
         const message = MessageHandler.getErrorMessage('validation.page_positive');
         expect(message).toBe('Page must be a positive integer');
      });

      it('should retrieve not found error message', () => {
         const message = MessageHandler.getErrorMessage('not_found.audiobook');
         expect(message).toBe('AudioBook not found');
      });

      it('should retrieve internal error message', () => {
         const message = MessageHandler.getErrorMessage('internal.database_operation');
         expect(message).toBe('Database operation failed');
      });

      it('should return default message for non-existent error key', () => {
         const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

         const message = MessageHandler.getErrorMessage('nonexistent.error');

         expect(message).toBe('An error occurred');
         expect(consoleWarnSpy).toHaveBeenCalled();

         consoleWarnSpy.mockRestore();
      });

      it('should format error message with template variables', () => {
         const message = MessageHandler.getErrorMessage('not_found.route', { route: '/api/test' });
         expect(message).toBe('Route /api/test not found');
      });
   });

   describe('getApiInfo', () => {
      beforeEach(() => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
      });

      it('should retrieve API title', () => {
         const info = MessageHandler.getApiInfo('info.title');
         expect(info).toBe('AudioBook API Server');
      });

      it('should retrieve API version', () => {
         const info = MessageHandler.getApiInfo('info.version');
         expect(info).toBe('1.0.0');
      });

      it('should retrieve API status', () => {
         const info = MessageHandler.getApiInfo('info.status_running');
         expect(info).toBe('running');
      });

      it('should retrieve nested API information', () => {
         const info = MessageHandler.getApiInfo('info.endpoints.health');
         expect(info).toBe('/api/health');
      });

      it('should return undefined for non-existent key', () => {
         const info = MessageHandler.getApiInfo('nonexistent.key');
         expect(info).toBeUndefined();
      });
   });

   describe('getValidationRule', () => {
      beforeEach(() => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
      });

      it('should retrieve pagination max limit', () => {
         const limit = MessageHandler.getValidationRule('pagination.max_limit');
         expect(limit).toBe(100);
      });

      it('should retrieve default pagination values', () => {
         const defaultLimit = MessageHandler.getValidationRule('pagination.default_limit');
         expect(defaultLimit).toBe(10);

         const defaultPage = MessageHandler.getValidationRule('pagination.default_page');
         expect(defaultPage).toBe(1);
      });

      it('should retrieve allowed sort fields', () => {
         const allowedFields = MessageHandler.getValidationRule('sort_fields.allowed');
         expect(Array.isArray(allowedFields)).toBe(true);
         expect(allowedFields).toContain('title');
         expect(allowedFields).toContain('author');
      });

      it('should retrieve max string length', () => {
         const maxLength = MessageHandler.getValidationRule('string_fields.max_length');
         expect(maxLength).toBe(100);
      });

      it('should retrieve ISBN formats', () => {
         const formats = MessageHandler.getValidationRule('isbn.formats');
         expect(Array.isArray(formats)).toBe(true);
         expect(formats).toContain('10-digit');
         expect(formats).toContain('13-digit');
      });
   });

   describe('Template Variable Formatting', () => {
      it('should handle special characters in variables', () => {
         const message = MessageHandler['formatMessage'](
            'Genre: {genre}',
            { genre: 'Sci-Fi & Fantasy' }
         );
         expect(message).toBe('Genre: Sci-Fi & Fantasy');
      });

      it('should handle empty strings in variables', () => {
         const message = MessageHandler['formatMessage'](
            'Author: {author}',
            { author: '' }
         );
         expect(message).toBe('Author: ');
      });

      it('should handle numbers in variables', () => {
         const message = MessageHandler['formatMessage'](
            'Count: {count}',
            { count: 42 }
         );
         expect(message).toBe('Count: 42');
      });

      it('should handle objects in variables', () => {
         const message = MessageHandler['formatMessage'](
            'Data: {data}',
            { data: { key: 'value' } }
         );
         expect(message).toContain('[object Object]');
      });

      it('should not replace undefined variables', () => {
         const message = MessageHandler['formatMessage'](
            'Genre: {genre}',
            {}
         );
         expect(message).toBe('Genre: {genre}');
      });
   });

   describe('Edge Cases', () => {
      it('should handle messages with no variables', () => {
         (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
         });
         MessageHandler['reloadMessages']();
         const message = MessageHandler.getSuccessMessage('general.success');
         expect(message).toBe('Success');
      });

      it('should handle very long variable values', () => {
         const longString = 'A'.repeat(1000);
         const message = MessageHandler['formatMessage'](
            'Value: {value}',
            { value: longString }
         );
         expect(message).toBe('Value: ' + longString);
      });

      it('should handle unicode characters in variables', () => {
         const message = MessageHandler['formatMessage'](
            'Author: {author}',
            { author: 'Jón Müller' }
         );
         expect(message).toBe('Author: Jón Müller');
      });
   });
});

