/**
 * Swagger/OpenAPI Configuration
 * Code-first approach for API documentation
 */
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from './env';

const options: swaggerJsdoc.Options = {
   definition: {
      openapi: '3.0.0',
      info: {
         title: 'AudioBook API',
         version: '1.0.0',
         description: 'A comprehensive REST API for managing audiobooks with features like search, filtering, and statistics.',
         contact: {
            name: 'AudioBook API Support',
            email: 'support@audiobook-api.com'
         },
         license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
         }
      },
      servers: [
         {
            url: `http://localhost:${config.PORT}/api`,
            description: 'Development server'
         },
         {
            url: 'https://api.audiobook.com/api',
            description: 'Production server'
         }
      ],
      components: {
         securitySchemes: {
            sessionAuth: {
               type: 'apiKey',
               in: 'cookie',
               name: 'connect.sid',
               description: 'Session-based authentication using express-session cookies'
            },
            csrfToken: {
               type: 'apiKey',
               in: 'header',
               name: 'X-CSRF-Token',
               description: 'CSRF token for state-changing operations'
            }
         },
         schemas: {
            AudioBook: {
               type: 'object',
               required: ['id', 'title', 'author', 'duration', 'fileSize', 'filePath', 'language', 'isActive', 'isPublic'],
               properties: {
                  id: {
                     type: 'string',
                     format: 'uuid',
                     description: 'Unique identifier for the audiobook',
                     example: '123e4567-e89b-12d3-a456-426614174000'
                  },
                  title: {
                     type: 'string',
                     description: 'Title of the audiobook',
                     example: 'The Great Gatsby'
                  },
                  author: {
                     type: 'string',
                     description: 'Author of the audiobook',
                     example: 'F. Scott Fitzgerald'
                  },
                  narrator: {
                     type: 'string',
                     description: 'Narrator of the audiobook',
                     example: 'Jake Gyllenhaal',
                     nullable: true
                  },
                  description: {
                     type: 'string',
                     description: 'Description of the audiobook',
                     example: 'A classic American novel set in the Jazz Age',
                     nullable: true
                  },
                  duration: {
                     type: 'number',
                     description: 'Duration in minutes',
                     example: 180,
                     minimum: 0
                  },
                  fileSize: {
                     type: 'number',
                     description: 'File size in bytes',
                     example: 52428800,
                     minimum: 0
                  },
                  filePath: {
                     type: 'string',
                     description: 'Path to the audio file',
                     example: '/uploads/audiobooks/great-gatsby.mp3'
                  },
                  coverImage: {
                     type: 'string',
                     description: 'URL to the cover image',
                     example: 'https://example.com/covers/great-gatsby.jpg',
                     nullable: true
                  },
                  genre: {
                     type: 'string',
                     description: 'Genre of the audiobook',
                     example: 'Fiction',
                     nullable: true
                  },
                  language: {
                     type: 'string',
                     description: 'Language of the audiobook',
                     example: 'English'
                  },
                  publisher: {
                     type: 'string',
                     description: 'Publisher of the audiobook',
                     example: 'Penguin Random House',
                     nullable: true
                  },
                  publishDate: {
                     type: 'string',
                     format: 'date',
                     description: 'Publication date',
                     example: '1925-04-10',
                     nullable: true
                  },
                  isbn: {
                     type: 'string',
                     description: 'ISBN number',
                     example: '978-0-7432-7356-5',
                     nullable: true
                  },
                  isActive: {
                     type: 'boolean',
                     description: 'Whether the audiobook is active',
                     example: true
                  },
                  isPublic: {
                     type: 'boolean',
                     description: 'Whether the audiobook is publicly available',
                     example: true
                  },
                  createdAt: {
                     type: 'string',
                     format: 'date-time',
                     description: 'Creation timestamp',
                     example: '2024-01-15T10:30:00Z'
                  },
                  updatedAt: {
                     type: 'string',
                     format: 'date-time',
                     description: 'Last update timestamp',
                     example: '2024-01-15T10:30:00Z'
                  }
               }
            },
            CreateAudioBookRequest: {
               type: 'object',
               required: ['title', 'author', 'duration', 'fileSize', 'filePath'],
               properties: {
                  title: {
                     type: 'string',
                     description: 'Title of the audiobook',
                     example: 'The Great Gatsby'
                  },
                  author: {
                     type: 'string',
                     description: 'Author of the audiobook',
                     example: 'F. Scott Fitzgerald'
                  },
                  narrator: {
                     type: 'string',
                     description: 'Narrator of the audiobook',
                     example: 'Jake Gyllenhaal'
                  },
                  description: {
                     type: 'string',
                     description: 'Description of the audiobook',
                     example: 'A classic American novel set in the Jazz Age'
                  },
                  duration: {
                     type: 'number',
                     description: 'Duration in minutes',
                     example: 180,
                     minimum: 0
                  },
                  fileSize: {
                     type: 'number',
                     description: 'File size in bytes',
                     example: 52428800,
                     minimum: 0
                  },
                  filePath: {
                     type: 'string',
                     description: 'Path to the audio file',
                     example: '/uploads/audiobooks/great-gatsby.mp3'
                  },
                  coverImage: {
                     type: 'string',
                     description: 'URL to the cover image',
                     example: 'https://example.com/covers/great-gatsby.jpg'
                  },
                  genre: {
                     type: 'string',
                     description: 'Genre of the audiobook',
                     example: 'Fiction'
                  },
                  language: {
                     type: 'string',
                     description: 'Language of the audiobook',
                     example: 'English',
                     default: 'English'
                  },
                  publisher: {
                     type: 'string',
                     description: 'Publisher of the audiobook',
                     example: 'Penguin Random House'
                  },
                  publishDate: {
                     type: 'string',
                     format: 'date',
                     description: 'Publication date',
                     example: '1925-04-10'
                  },
                  isbn: {
                     type: 'string',
                     description: 'ISBN number',
                     example: '978-0-7432-7356-5'
                  },
                  isActive: {
                     type: 'boolean',
                     description: 'Whether the audiobook is active',
                     example: true,
                     default: true
                  },
                  isPublic: {
                     type: 'boolean',
                     description: 'Whether the audiobook is publicly available',
                     example: true,
                     default: true
                  }
               }
            },
            UpdateAudioBookRequest: {
               type: 'object',
               properties: {
                  title: {
                     type: 'string',
                     description: 'Title of the audiobook',
                     example: 'The Great Gatsby'
                  },
                  author: {
                     type: 'string',
                     description: 'Author of the audiobook',
                     example: 'F. Scott Fitzgerald'
                  },
                  narrator: {
                     type: 'string',
                     description: 'Narrator of the audiobook',
                     example: 'Jake Gyllenhaal'
                  },
                  description: {
                     type: 'string',
                     description: 'Description of the audiobook',
                     example: 'A classic American novel set in the Jazz Age'
                  },
                  duration: {
                     type: 'number',
                     description: 'Duration in minutes',
                     example: 180,
                     minimum: 0
                  },
                  fileSize: {
                     type: 'number',
                     description: 'File size in bytes',
                     example: 52428800,
                     minimum: 0
                  },
                  filePath: {
                     type: 'string',
                     description: 'Path to the audio file',
                     example: '/uploads/audiobooks/great-gatsby.mp3'
                  },
                  coverImage: {
                     type: 'string',
                     description: 'URL to the cover image',
                     example: 'https://example.com/covers/great-gatsby.jpg'
                  },
                  genre: {
                     type: 'string',
                     description: 'Genre of the audiobook',
                     example: 'Fiction'
                  },
                  language: {
                     type: 'string',
                     description: 'Language of the audiobook',
                     example: 'English'
                  },
                  publisher: {
                     type: 'string',
                     description: 'Publisher of the audiobook',
                     example: 'Penguin Random House'
                  },
                  publishDate: {
                     type: 'string',
                     format: 'date',
                     description: 'Publication date',
                     example: '1925-04-10'
                  },
                  isbn: {
                     type: 'string',
                     description: 'ISBN number',
                     example: '978-0-7432-7356-5'
                  },
                  isActive: {
                     type: 'boolean',
                     description: 'Whether the audiobook is active',
                     example: true
                  },
                  isPublic: {
                     type: 'boolean',
                     description: 'Whether the audiobook is publicly available',
                     example: true
                  }
               }
            },
            AudioBookStats: {
               type: 'object',
               properties: {
                  totalAudioBooks: {
                     type: 'number',
                     description: 'Total number of audiobooks',
                     example: 150
                  },
                  activeAudioBooks: {
                     type: 'number',
                     description: 'Number of active audiobooks',
                     example: 145
                  },
                  publicAudioBooks: {
                     type: 'number',
                     description: 'Number of public audiobooks',
                     example: 120
                  },
                  totalDuration: {
                     type: 'number',
                     description: 'Total duration in minutes',
                     example: 45000
                  },
                  averageDuration: {
                     type: 'number',
                     description: 'Average duration in minutes',
                     example: 300
                  },
                  genres: {
                     type: 'array',
                     items: {
                        type: 'object',
                        properties: {
                           genre: {
                              type: 'string',
                              example: 'Fiction'
                           },
                           count: {
                              type: 'number',
                              example: 45
                           }
                        }
                     }
                  },
                  languages: {
                     type: 'array',
                     items: {
                        type: 'object',
                        properties: {
                           language: {
                              type: 'string',
                              example: 'English'
                           },
                           count: {
                              type: 'number',
                              example: 120
                           }
                        }
                     }
                  }
               }
            },
            PaginationInfo: {
               type: 'object',
               properties: {
                  currentPage: {
                     type: 'number',
                     description: 'Current page number',
                     example: 1
                  },
                  totalPages: {
                     type: 'number',
                     description: 'Total number of pages',
                     example: 10
                  },
                  totalItems: {
                     type: 'number',
                     description: 'Total number of items',
                     example: 100
                  },
                  itemsPerPage: {
                     type: 'number',
                     description: 'Number of items per page',
                     example: 10
                  },
                  hasNextPage: {
                     type: 'boolean',
                     description: 'Whether there is a next page',
                     example: true
                  },
                  hasPreviousPage: {
                     type: 'boolean',
                     description: 'Whether there is a previous page',
                     example: false
                  }
               }
            },
            ApiResponse: {
               type: 'object',
               properties: {
                  success: {
                     type: 'boolean',
                     description: 'Whether the request was successful',
                     example: true
                  },
                  message: {
                     type: 'string',
                     description: 'Response message',
                     example: 'AudioBooks retrieved successfully'
                  },
                  data: {
                     type: 'object',
                     description: 'Response data'
                  },
                  timestamp: {
                     type: 'string',
                     format: 'date-time',
                     description: 'Response timestamp',
                     example: '2024-01-15T10:30:00Z'
                  }
               },
               example: {
                  success: true,
                  message: 'AudioBooks retrieved successfully',
                  data: {},
                  timestamp: '2024-01-15T10:30:00Z'
               }
            },
            PaginatedResponse: {
               type: 'object',
               properties: {
                  success: {
                     type: 'boolean',
                     description: 'Whether the request was successful',
                     example: true
                  },
                  message: {
                     type: 'string',
                     description: 'Response message',
                     example: 'AudioBooks retrieved successfully'
                  },
                  data: {
                     type: 'array',
                     items: {
                        $ref: '#/components/schemas/AudioBook'
                     }
                  },
                  pagination: {
                     $ref: '#/components/schemas/PaginationInfo'
                  },
                  timestamp: {
                     type: 'string',
                     format: 'date-time',
                     description: 'Response timestamp',
                     example: '2024-01-15T10:30:00Z'
                  }
               },
               example: {
                  success: true,
                  message: 'AudioBooks retrieved successfully',
                  data: [
                     {
                        id: '123e4567-e89b-12d3-a456-426614174000',
                        title: 'The Great Gatsby',
                        author: 'F. Scott Fitzgerald',
                        narrator: 'Jake Gyllenhaal',
                        description: 'A classic American novel set in the Jazz Age',
                        duration: 180,
                        fileSize: 52428800,
                        filePath: '/uploads/audiobooks/great-gatsby.mp3',
                        coverImage: 'https://example.com/covers/great-gatsby.jpg',
                        genre: 'Fiction',
                        language: 'English',
                        publisher: 'Penguin Random House',
                        publishDate: '1925-04-10',
                        isbn: '978-0-7432-7356-5',
                        isActive: true,
                        isPublic: true,
                        createdAt: '2024-01-15T10:30:00Z',
                        updatedAt: '2024-01-15T10:30:00Z'
                     }
                  ],
                  pagination: {
                     currentPage: 1,
                     totalPages: 10,
                     totalItems: 100,
                     itemsPerPage: 10,
                     hasNextPage: true,
                     hasPreviousPage: false
                  },
                  timestamp: '2024-01-15T10:30:00Z'
               }
            },
            ErrorResponse: {
               type: 'object',
               properties: {
                  success: {
                     type: 'boolean',
                     description: 'Whether the request was successful',
                     example: false
                  },
                  message: {
                     type: 'string',
                     description: 'Error message',
                     example: 'AudioBook not found'
                  },
                  error: {
                     type: 'object',
                     properties: {
                        name: {
                           type: 'string',
                           example: 'ApiError'
                        },
                        message: {
                           type: 'string',
                           example: 'AudioBook not found'
                        },
                        statusCode: {
                           type: 'number',
                           example: 404
                        },
                        errorType: {
                           type: 'string',
                           example: 'NOT_FOUND'
                        },
                        timestamp: {
                           type: 'string',
                           format: 'date-time',
                           example: '2024-01-15T10:30:00Z'
                        },
                        path: {
                           type: 'string',
                           example: '/api/v1/audiobooks/123'
                        }
                     }
                  },
                  timestamp: {
                     type: 'string',
                     format: 'date-time',
                     description: 'Response timestamp',
                     example: '2024-01-15T10:30:00Z'
                  }
               },
               example: {
                  success: false,
                  message: 'AudioBook not found',
                  error: {
                     name: 'ApiError',
                     message: 'AudioBook not found',
                     statusCode: 404,
                     errorType: 'NOT_FOUND',
                     timestamp: '2024-01-15T10:30:00Z',
                     path: '/api/v1/audiobooks/123'
                  },
                  timestamp: '2024-01-15T10:30:00Z'
               }
            },
            ValidationError: {
               type: 'object',
               properties: {
                  success: {
                     type: 'boolean',
                     description: 'Whether the request was successful',
                     example: false
                  },
                  message: {
                     type: 'string',
                     description: 'Error message',
                     example: 'Validation failed'
                  },
                  errors: {
                     type: 'array',
                     items: {
                        type: 'object',
                        properties: {
                           field: {
                              type: 'string',
                              example: 'title'
                           },
                           message: {
                              type: 'string',
                              example: 'Title is required'
                           }
                        }
                     }
                  },
                  timestamp: {
                     type: 'string',
                     format: 'date-time',
                     description: 'Response timestamp',
                     example: '2024-01-15T10:30:00Z'
                  }
               }
            },
         },
         parameters: {
            PageParam: {
               name: 'page',
               in: 'query',
               description: 'Page number for pagination',
               required: false,
               schema: {
                  type: 'integer',
                  minimum: 1,
                  default: 1,
                  example: 1
               }
            },
            LimitParam: {
               name: 'limit',
               in: 'query',
               description: 'Number of items per page',
               required: false,
               schema: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                  example: 10
               }
            },
            SortByParam: {
               name: 'sortBy',
               in: 'query',
               description: 'Field to sort by',
               required: false,
               schema: {
                  type: 'string',
                  enum: ['title', 'author', 'duration', 'createdAt', 'updatedAt'],
                  default: 'createdAt',
                  example: 'createdAt'
               }
            },
            SortOrderParam: {
               name: 'sortOrder',
               in: 'query',
               description: 'Sort order',
               required: false,
               schema: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  default: 'desc',
                  example: 'desc'
               }
            },
            GenreParam: {
               name: 'genre',
               in: 'query',
               description: 'Filter by genre',
               required: false,
               schema: {
                  type: 'string',
                  example: 'Fiction'
               }
            },
            LanguageParam: {
               name: 'language',
               in: 'query',
               description: 'Filter by language',
               required: false,
               schema: {
                  type: 'string',
                  example: 'English'
               }
            },
            AuthorParam: {
               name: 'author',
               in: 'query',
               description: 'Filter by author',
               required: false,
               schema: {
                  type: 'string',
                  example: 'F. Scott Fitzgerald'
               }
            },
            NarratorParam: {
               name: 'narrator',
               in: 'query',
               description: 'Filter by narrator',
               required: false,
               schema: {
                  type: 'string',
                  example: 'Jake Gyllenhaal'
               }
            },
            IsActiveParam: {
               name: 'isActive',
               in: 'query',
               description: 'Filter by active status',
               required: false,
               schema: {
                  type: 'boolean',
                  example: true
               }
            },
            IsPublicParam: {
               name: 'isPublic',
               in: 'query',
               description: 'Filter by public status',
               required: false,
               schema: {
                  type: 'boolean',
                  example: true
               }
            },
            SearchParam: {
               name: 'search',
               in: 'query',
               description: 'Search term for title, author, or description',
               required: false,
               schema: {
                  type: 'string',
                  example: 'gatsby'
               }
            },
            QueryParam: {
               name: 'q',
               in: 'query',
               description: 'Search query',
               required: true,
               schema: {
                  type: 'string',
                  example: 'gatsby'
               }
            },
            IdParam: {
               name: 'id',
               in: 'path',
               description: 'AudioBook ID',
               required: true,
               schema: {
                  type: 'string',
                  format: 'uuid',
                  example: '123e4567-e89b-12d3-a456-426614174000'
               }
            },
            GenrePathParam: {
               name: 'genre',
               in: 'path',
               description: 'Genre name',
               required: true,
               schema: {
                  type: 'string',
                  example: 'Fiction'
               }
            },
            AuthorPathParam: {
               name: 'author',
               in: 'path',
               description: 'Author name',
               required: true,
               schema: {
                  type: 'string',
                  example: 'F. Scott Fitzgerald'
               }
            }
         },
         responses: {
            Success: {
               description: 'Successful response',
               content: {
                  'application/json': {
                     schema: {
                        $ref: '#/components/schemas/ApiResponse'
                     }
                  }
               }
            },
            PaginatedSuccess: {
               description: 'Successful paginated response',
               content: {
                  'application/json': {
                     schema: {
                        $ref: '#/components/schemas/PaginatedResponse'
                     }
                  }
               }
            },
            Created: {
               description: 'Resource created successfully',
               content: {
                  'application/json': {
                     schema: {
                        $ref: '#/components/schemas/ApiResponse'
                     }
                  }
               }
            },
            NoContent: {
               description: 'No content',
               content: {
                  'application/json': {
                     schema: {
                        type: 'object',
                        properties: {
                           success: {
                              type: 'boolean',
                              example: true
                           },
                           message: {
                              type: 'string',
                              example: 'Resource deleted successfully'
                           }
                        }
                     }
                  }
               }
            },
            BadRequest: {
               description: 'Bad request',
               content: {
                  'application/json': {
                     schema: {
                        $ref: '#/components/schemas/ErrorResponse'
                     }
                  }
               }
            },
            ValidationError: {
               description: 'Validation error',
               content: {
                  'application/json': {
                     schema: {
                        $ref: '#/components/schemas/ValidationError'
                     }
                  }
               }
            },
            NotFound: {
               description: 'Resource not found',
               content: {
                  'application/json': {
                     schema: {
                        $ref: '#/components/schemas/ErrorResponse'
                     }
                  }
               }
            },
            InternalServerError: {
               description: 'Internal server error',
               content: {
                  'application/json': {
                     schema: {
                        $ref: '#/components/schemas/ErrorResponse'
                     }
                  }
               }
            }
         }
      },
      tags: [
         {
            name: 'AudioBooks',
            description: 'Operations related to audiobooks'
         },
         {
            name: 'Health',
            description: 'Health check endpoints'
         }
      ]
   },
   apis: [
      './src/routes/*.ts',
      './src/controllers/*.ts'
   ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
   // Swagger UI
   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'AudioBook API Documentation',
      swaggerOptions: {
         persistAuthorization: true,
         displayRequestDuration: true,
         filter: true,
         showExtensions: true,
         showCommonExtensions: true
      }
   }));

   // JSON endpoint for OpenAPI spec
   app.get('/api-docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
   });
};

export { specs };
