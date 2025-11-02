import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  displayName: Joi.string()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot be longer than 50 characters',
    }),
  bio: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Bio cannot be longer than 500 characters',
    }),
  dateOfBirth: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Please provide a valid date of birth',
    }),
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional(),
  country: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Country name cannot be longer than 100 characters',
    }),
  city: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'City name cannot be longer than 100 characters',
    }),
  phone: Joi.string()
    .pattern(new RegExp('^\\+?[1-9]\\d{1,14}$'))
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  socialLinks: Joi.object({
    instagram: Joi.string()
      .uri()
      .optional()
      .allow('')
      .messages({
        'string.uri': 'Instagram URL must be a valid URL',
      }),
    twitter: Joi.string()
      .uri()
      .optional()
      .allow('')
      .messages({
        'string.uri': 'Twitter URL must be a valid URL',
      }),
    youtube: Joi.string()
      .uri()
      .optional()
      .allow('')
      .messages({
        'string.uri': 'YouTube URL must be a valid URL',
      }),
    tiktok: Joi.string()
      .uri()
      .optional()
      .allow('')
      .messages({
        'string.uri': 'TikTok URL must be a valid URL',
      }),
  }).optional(),
});

export const updateAvatarSchema = Joi.object({
  avatar: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Avatar must be a valid URL',
      'any.required': 'Avatar URL is required',
    }),
});

export const updateSettingsSchema = Joi.object({
  privacy: Joi.object({
    showEmail: Joi.boolean().optional(),
    showPhone: Joi.boolean().optional(),
    allowMessages: Joi.string()
      .valid('everyone', 'followers', 'none')
      .optional(),
    allowGifts: Joi.boolean().optional(),
  }).optional(),
  notifications: Joi.object({
    email: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    newFollower: Joi.boolean().optional(),
    newMessage: Joi.boolean().optional(),
    liveStream: Joi.boolean().optional(),
    gifts: Joi.boolean().optional(),
  }).optional(),
});

export const searchUsersSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Search query cannot be empty',
      'string.max': 'Search query cannot be longer than 100 characters',
      'any.required': 'Search query is required',
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot be more than 100',
    }),
  sortBy: Joi.string()
    .valid('relevance', 'followers', 'level', 'newest')
    .optional()
    .default('relevance'),
  filter: Joi.string()
    .valid('verified', 'all', 'online', 'live')
    .optional()
    .default('verified'),
});

export const getTopUsersSchema = Joi.object({
  type: Joi.string()
    .valid('followers', 'level', 'streams', 'watchtime')
    .optional()
    .default('followers'),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot be more than 100',
    }),
});

export const blockUserSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot be longer than 500 characters',
    }),
});

export const userIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(new RegExp('^c[a-z0-9]{24}$'))
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required',
    }),
});

export const addXpSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(1)
    .max(1000000)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.integer': 'Amount must be an integer',
      'number.min': 'Amount must be at least 1',
      'number.max': 'Amount cannot exceed 1,000,000',
      'any.required': 'Amount is required',
    }),
  reason: Joi.string().max(200).optional(),
});