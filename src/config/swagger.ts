import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WebsaChat Backend API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for WebsaChat streaming platform backend',
      contact: {
        name: 'WebsaChat Development Team',
        email: 'dev@websachat.com',
        url: 'https://websachat.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.websachat.com',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.websachat.com',
        description: 'Staging server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for external integrations'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details'
                }
              }
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name that failed validation'
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message'
                  },
                  value: {
                    description: 'Invalid value'
                  }
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages'
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there is a next page'
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there is a previous page'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            displayName: {
              type: 'string',
              description: 'Display name'
            },
            avatar: {
              type: 'string',
              description: 'Avatar URL'
            },
            role: {
              type: 'string',
              enum: ['user', 'streamer', 'moderator', 'admin'],
              description: 'User role'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'banned', 'suspended'],
              description: 'Account status'
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether user is verified'
            },
            followers: {
              type: 'integer',
              description: 'Number of followers'
            },
            following: {
              type: 'integer',
              description: 'Number of users following'
            },
            totalGiftsReceived: {
              type: 'number',
              description: 'Total value of gifts received'
            },
            level: {
              type: 'integer',
              description: 'User level'
            },
            experience: {
              type: 'integer',
              description: 'Experience points'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Stream: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Stream ID'
            },
            title: {
              type: 'string',
              description: 'Stream title'
            },
            description: {
              type: 'string',
              description: 'Stream description'
            },
            streamer: {
              $ref: '#/components/schemas/User'
            },
            category: {
              type: 'string',
              description: 'Stream category'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Stream tags'
            },
            thumbnail: {
              type: 'string',
              description: 'Stream thumbnail URL'
            },
            status: {
              type: 'string',
              enum: ['live', 'offline', 'scheduled', 'ended'],
              description: 'Stream status'
            },
            viewers: {
              type: 'integer',
              description: 'Current viewer count'
            },
            maxViewers: {
              type: 'integer',
              description: 'Maximum viewers reached'
            },
            duration: {
              type: 'integer',
              description: 'Stream duration in seconds'
            },
            startedAt: {
              type: 'string',
              format: 'date-time'
            },
            endedAt: {
              type: 'string',
              format: 'date-time'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Gift: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Gift ID'
            },
            name: {
              type: 'string',
              description: 'Gift name'
            },
            description: {
              type: 'string',
              description: 'Gift description'
            },
            icon: {
              type: 'string',
              description: 'Gift icon URL'
            },
            animation: {
              type: 'string',
              description: 'Gift animation URL'
            },
            price: {
              type: 'number',
              description: 'Gift price in coins'
            },
            category: {
              type: 'string',
              description: 'Gift category'
            },
            rarity: {
              type: 'string',
              enum: ['common', 'rare', 'epic', 'legendary'],
              description: 'Gift rarity'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether gift is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Authentication required',
                error: {
                  code: 'UNAUTHORIZED',
                  details: {}
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Insufficient permissions',
                error: {
                  code: 'FORBIDDEN',
                  details: {}
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Resource not found',
                error: {
                  code: 'NOT_FOUND',
                  details: {}
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Internal server error',
                error: {
                  code: 'INTERNAL_ERROR',
                  details: {}
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Streams',
        description: 'Stream management endpoints'
      },
      {
        name: 'Gifts',
        description: 'Gift system endpoints'
      },
      {
        name: 'Chat',
        description: 'Chat and messaging endpoints'
      },
      {
        name: 'Moderation',
        description: 'Content and user moderation endpoints'
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints'
      },
      {
        name: 'System Settings',
        description: 'System configuration and settings endpoints'
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints'
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
  // Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
      // Add lightweight local types for interceptors to avoid `any`
      // and add explicit return types
      // NOTE: These types match Swagger UI's request/response shapes sufficiently for our use.
      requestInterceptor: (req: {
        url?: string;
        method?: string;
        body?: unknown;
        headers?: Record<string, string>;
        credentials?: 'include' | 'same-origin' | 'omit';
      }): {
        url?: string;
        method?: string;
        body?: unknown;
        headers?: Record<string, string>;
        credentials?: 'include' | 'same-origin' | 'omit';
      } => {
        // Add custom headers or modify requests
        return req;
      },
      responseInterceptor: (res: {
        data?: unknown;
        headers?: Record<string, string>;
        status?: number;
        url?: string;
      }): {
        data?: unknown;
        headers?: Record<string, string>;
        status?: number;
        url?: string;
      } => {
        // Process responses
        return res;
      }
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0 }
    `,
    customSiteTitle: 'WebsaChat API Documentation',
    customfavIcon: '/favicon.ico'
  };

  // Serve Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at /api-docs');
};

export { specs };
export default setupSwagger;