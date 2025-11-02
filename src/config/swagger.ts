import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import cors from 'cors';

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
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Local development server'
      },
      {
        url: `http://127.0.0.1:${process.env.PORT || 5000}`,
        description: 'Local development server (127.0.0.1)'
      },
      {
        url: `http://192.168.2.55:${process.env.PORT || 5000}`,
        description: 'Network development server'
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
        },
        LoginRequest: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: {
              type: 'string',
              description: 'Username or email address',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'MySecurePassword123'
            },
            rememberMe: {
              type: 'boolean',
              description: 'Remember user login',
              default: false,
              example: false
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password', 'confirmPassword', 'displayName'],
          properties: {
            username: {
              type: 'string',
              pattern: '^[a-zA-Z0-9_]+$',
              minLength: 3,
              maxLength: 30,
              description: 'Unique username (letters, numbers, underscores only)',
              example: 'john_doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              maxLength: 128,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
              description: 'Password (min 6 chars, must contain lowercase, uppercase, and number)',
              example: 'MySecurePassword123'
            },
            confirmPassword: {
              type: 'string',
              description: 'Password confirmation (must match password)',
              example: 'MySecurePassword123'
            },
            displayName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Display name',
              example: 'John Doe'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth',
              example: '1990-01-01'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'Gender',
              example: 'male'
            },
            country: {
              type: 'string',
              maxLength: 100,
              description: 'Country',
              example: 'United States'
            },
            city: {
              type: 'string',
              maxLength: 100,
              description: 'City',
              example: 'New York'
            },
            phone: {
              type: 'string',
              pattern: '^\\+?[1-9]\\d{1,14}$',
              description: 'Phone number',
              example: '+1234567890'
            },
            inviteCode: {
              type: 'string',
              description: 'Admin invite code (optional)',
              example: 'ADMIN_INVITE_CODE'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                accessToken: {
                  type: 'string',
                  description: 'JWT access token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                refreshToken: {
                  type: 'string',
                  description: 'JWT refresh token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                expiresIn: {
                  type: 'integer',
                  description: 'Token expiration time in seconds',
                  example: 3600
                }
              }
            }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Display name',
              example: 'John Doe'
            },
            bio: {
              type: 'string',
              maxLength: 500,
              description: 'User biography',
              example: 'Software developer and streaming enthusiast'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth',
              example: '1990-01-01'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'prefer_not_to_say'],
              description: 'Gender (will be converted to uppercase enum)',
              example: 'male'
            },
            country: {
              type: 'string',
              maxLength: 100,
              description: 'Country',
              example: 'United States'
            },
            city: {
              type: 'string',
              maxLength: 100,
              description: 'City',
              example: 'New York'
            },
            socialLinks: {
              type: 'object',
              description: 'Social media links',
              properties: {
                twitter: {
                  type: 'string',
                  description: 'Twitter profile URL',
                  example: 'https://twitter.com/johndoe'
                },
                instagram: {
                  type: 'string',
                  description: 'Instagram profile URL',
                  example: 'https://instagram.com/johndoe'
                },
                youtube: {
                  type: 'string',
                  description: 'YouTube channel URL',
                  example: 'https://youtube.com/c/johndoe'
                },
                twitch: {
                  type: 'string',
                  description: 'Twitch channel URL',
                  example: 'https://twitch.tv/johndoe'
                },
                tiktok: {
                  type: 'string',
                  description: 'TikTok profile URL',
                  example: 'https://tiktok.com/@johndoe'
                },
                website: {
                  type: 'string',
                  description: 'Personal website URL',
                  example: 'https://johndoe.com'
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/docs/*.ts'] // Swagger JSDoc için route ve ayrı docs dosyalarını belirt
};

// Swagger spesifikasyonunu oluştur
const specs = swaggerJsdoc(options);

// Swagger UI kurulum fonksiyonu
export const setupSwagger = (app: Express): void => {
  app.use(
    '/api-docs',
    cors({
      // Tüm origin'lere izin: isteğin origin'ini yansıt
      origin: (origin, callback) => callback(null, true),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    }),
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'WebsaChat API Documentation',
    }),
  );
};

// Swagger spesifikasyonunu export et
export { specs };
export default options;