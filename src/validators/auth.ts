import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot be longer than 30 characters',
      'any.required': 'Username is required',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot be longer than 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
  displayName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Display name is required',
      'string.max': 'Display name cannot be longer than 50 characters',
      'any.required': 'Display name is required',
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
    .trim()
    .lowercase()
    .valid('male', 'female', 'other')
    .optional(),
  country: Joi.string()
    .max(100)
    .optional(),
  city: Joi.string()
    .max(100)
    .optional(),
  phone: Joi.string()
    .pattern(new RegExp('^\\+?[1-9]\\d{1,14}$'))
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
});

export const loginSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .messages({
      'any.required': 'Username or email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
  rememberMe: Joi.boolean()
    .optional()
    .default(false),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot be longer than 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot be longer than 128 characters',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'New password is required',
    }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'New password confirmation is required',
    }),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required',
    }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

export const resendVerificationPublicSchema = Joi.object({
  email: Joi.string().email().required(),
});