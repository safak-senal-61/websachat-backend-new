import Joi from 'joi';

// Create stream validation
export const createStreamSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Stream title is required',
      'string.min': 'Stream title must be at least 1 character long',
      'string.max': 'Stream title cannot exceed 100 characters',
      'any.required': 'Stream title is required',
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),
  
  category: Joi.string()
    .valid(
      'gaming', 'music', 'entertainment', 'education', 'sports',
      'technology', 'lifestyle', 'cooking', 'art', 'fitness',
      'travel', 'news', 'talk-show', 'comedy', 'other'
    )
    .required()
    .messages({
      'any.only': 'Invalid category selected',
      'any.required': 'Category is required',
    }),
  
  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(30)
        .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    )
    .max(10)
    .unique()
    .optional()
    .messages({
      'array.max': 'Maximum 10 tags allowed',
      'array.unique': 'Tags must be unique',
      'string.pattern.base': 'Tags can only contain letters, numbers, spaces, hyphens, and underscores',
      'string.max': 'Each tag cannot exceed 30 characters',
    }),
  
  visibility: Joi.string()
    .valid('public', 'private', 'followers-only')
    .default('public')
    .messages({
      'any.only': 'Visibility must be public, private, or followers-only',
    }),
  
  scheduledAt: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Scheduled time must be in the future',
    }),
  
  settings: Joi.object({
    allowComments: Joi.boolean().default(true),
    allowGifts: Joi.boolean().default(true),
    allowRecording: Joi.boolean().default(true),
    moderationLevel: Joi.string()
      .valid('low', 'medium', 'high')
      .default('medium'),
    maxViewers: Joi.number()
      .integer()
      .min(1)
      .max(100000)
      .optional(),
    requireFollowToChat: Joi.boolean().default(false),
    slowModeDelay: Joi.number()
      .integer()
      .min(0)
      .max(300)
      .default(0)
      .messages({
        'number.max': 'Slow mode delay cannot exceed 300 seconds',
      }),
  }).optional(),
  
  technical: Joi.object({
    quality: Joi.array()
      .items(Joi.string().valid('240p', '360p', '480p', '720p', '1080p', '1440p', '4k'))
      .min(1)
      .unique()
      .default(['720p']),
    bitrate: Joi.number()
      .integer()
      .min(500)
      .max(50000)
      .default(2500),
    fps: Joi.number()
      .valid(24, 30, 60)
      .default(30),
    resolution: Joi.string()
      .pattern(/^\d+x\d+$/)
      .default('1920x1080')
      .messages({
        'string.pattern.base': 'Resolution must be in format WIDTHxHEIGHT (e.g., 1920x1080)',
      }),
    codec: Joi.string()
      .valid('h264', 'h265', 'vp8', 'vp9', 'av1')
      .default('h264'),
    serverRegion: Joi.string()
      .valid('us-east', 'us-west', 'eu-west', 'eu-central', 'asia-pacific', 'asia-southeast')
      .required()
      .messages({
        'any.required': 'Server region is required',
      }),
  }).optional(),
  
  monetization: Joi.object({
    isMonetized: Joi.boolean().default(false),
    giftSettings: Joi.object({
      enabled: Joi.boolean().default(true),
      minGiftValue: Joi.number()
        .integer()
        .min(1)
        .default(1),
      maxGiftValue: Joi.number()
        .integer()
        .min(1)
        .default(1000),
      allowedGifts: Joi.array()
        .items(Joi.string())
        .optional(),
    }).optional(),
    subscriptionTier: Joi.string()
      .valid('basic', 'premium', 'vip')
      .optional(),
    ticketPrice: Joi.number()
      .min(0)
      .optional(),
  }).optional(),
  
  metadata: Joi.object({
    language: Joi.string()
      .max(10)
      .default('en'),
    ageRating: Joi.string()
      .valid('all', '13+', '16+', '18+')
      .default('all'),
    contentWarnings: Joi.array()
      .items(Joi.string().valid('violence', 'language', 'adult-content', 'flashing-lights', 'loud-sounds'))
      .unique()
      .optional(),
    location: Joi.object({
      country: Joi.string().max(100).optional(),
      city: Joi.string().max(100).optional(),
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2)
        .optional()
        .custom((value, helpers) => {
          if (value && (value[0] < -180 || value[0] > 180 || value[1] < -90 || value[1] > 90)) {
            return helpers.error('any.invalid');
          }
          return value;
        })
        .messages({
          'any.invalid': 'Invalid coordinates (longitude: -180 to 180, latitude: -90 to 90)',
        }),
    }).optional(),
  }).optional(),
});

// Update stream validation
export const updateStreamSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Stream title must be at least 1 character long',
      'string.max': 'Stream title cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),
  
  category: Joi.string()
    .valid(
      'gaming', 'music', 'entertainment', 'education', 'sports',
      'technology', 'lifestyle', 'cooking', 'art', 'fitness',
      'travel', 'news', 'talk-show', 'comedy', 'other'
    )
    .optional()
    .messages({
      'any.only': 'Invalid category selected',
    }),
  
  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(30)
        .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    )
    .max(10)
    .unique()
    .optional()
    .messages({
      'array.max': 'Maximum 10 tags allowed',
      'array.unique': 'Tags must be unique',
      'string.pattern.base': 'Tags can only contain letters, numbers, spaces, hyphens, and underscores',
    }),
  
  visibility: Joi.string()
    .valid('public', 'private', 'followers-only')
    .optional()
    .messages({
      'any.only': 'Visibility must be public, private, or followers-only',
    }),
  
  settings: Joi.object({
    allowComments: Joi.boolean().optional(),
    allowGifts: Joi.boolean().optional(),
    allowRecording: Joi.boolean().optional(),
    moderationLevel: Joi.string()
      .valid('low', 'medium', 'high')
      .optional(),
    maxViewers: Joi.number()
      .integer()
      .min(1)
      .max(100000)
      .optional(),
    requireFollowToChat: Joi.boolean().optional(),
    slowModeDelay: Joi.number()
      .integer()
      .min(0)
      .max(300)
      .optional()
      .messages({
        'number.max': 'Slow mode delay cannot exceed 300 seconds',
      }),
  }).optional(),
});

// Stream search/filter validation
export const searchStreamsSchema = Joi.object({
  q: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character long',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  
  category: Joi.string()
    .valid(
      'gaming', 'music', 'entertainment', 'education', 'sports',
      'technology', 'lifestyle', 'cooking', 'art', 'fitness',
      'travel', 'news', 'talk-show', 'comedy', 'other'
    )
    .optional(),
  
  status: Joi.string()
    .valid('live', 'scheduled', 'ended')
    .default('live'),
  
  visibility: Joi.string()
    .valid('public', 'followers-only')
    .default('public'),
  
  language: Joi.string()
    .max(10)
    .optional(),
  
  ageRating: Joi.string()
    .valid('all', '13+', '16+', '18+')
    .optional(),
  
  minViewers: Joi.number()
    .integer()
    .min(0)
    .optional(),
  
  maxViewers: Joi.number()
    .integer()
    .min(0)
    .optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim().max(30))
    .max(5)
    .optional(),
  
  sortBy: Joi.string()
    .valid('viewers', 'recent', 'duration', 'relevance')
    .default('viewers'),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(20),
});

// Stream ID parameter validation
export const streamIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid stream ID format',
      'any.required': 'Stream ID is required',
    }),
});

// Join stream validation
export const joinStreamSchema = Joi.object({
  quality: Joi.string()
    .valid('240p', '360p', '480p', '720p', '1080p', '1440p', '4k')
    .default('720p'),
  
  autoPlay: Joi.boolean().default(true),
  
  chatEnabled: Joi.boolean().default(true),
});

// Stream moderation validation
export const moderateStreamSchema = Joi.object({
  action: Joi.string()
    .valid('mute', 'unmute', 'ban_user', 'unban_user', 'add_moderator', 'remove_moderator', 'end_stream')
    .required()
    .messages({
      'any.required': 'Moderation action is required',
    }),
  
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .when('action', {
      is: Joi.string().valid('ban_user', 'unban_user', 'add_moderator', 'remove_moderator'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required for this action',
    }),
  
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
    }),
  
  duration: Joi.number()
    .integer()
    .min(1)
    .max(168) // 1 week max
    .optional()
    .messages({
      'number.max': 'Duration cannot exceed 168 hours (1 week)',
    }),
});

// Stream analytics validation
export const streamAnalyticsSchema = Joi.object({
  period: Joi.string()
    .valid('hourly', 'daily', 'weekly', 'monthly', 'all-time')
    .default('daily'),
  
  metrics: Joi.array()
    .items(Joi.string().valid('viewers', 'duration', 'engagement', 'revenue', 'geography'))
    .min(1)
    .default(['viewers']),
  
  startDate: Joi.date()
    .optional(),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date',
    }),
});

// Get top streams validation
export const getTopStreamsSchema = Joi.object({
  period: Joi.string()
    .valid('hourly', 'daily', 'weekly', 'monthly', 'all-time')
    .default('daily'),
  
  category: Joi.string()
    .valid(
      'gaming', 'music', 'entertainment', 'education', 'sports',
      'technology', 'lifestyle', 'cooking', 'art', 'fitness',
      'travel', 'news', 'talk-show', 'comedy', 'other'
    )
    .optional(),
  
  metric: Joi.string()
    .valid('peak_viewers', 'total_viewers', 'duration', 'revenue', 'engagement')
    .default('peak_viewers'),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
});

// Stream thumbnail upload validation
export const uploadThumbnailSchema = Joi.object({
  thumbnail: Joi.any()
    .required()
    .messages({
      'any.required': 'Thumbnail file is required',
    }),
});

// Stream report validation
export const reportStreamSchema = Joi.object({
  reason: Joi.string()
    .valid(
      'inappropriate-content',
      'harassment',
      'spam',
      'violence',
      'copyright',
      'adult-content',
      'hate-speech',
      'other'
    )
    .required()
    .messages({
      'any.required': 'Report reason is required',
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),
  
  timestamp: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Timestamp must be a positive number',
    }),
});