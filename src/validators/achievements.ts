import Joi from 'joi';

export const grantAchievementSchema = Joi.object({
  userId: Joi.string()
    .pattern(new RegExp('^c[a-z0-9]{24}$'))
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'userId is required',
    }),
  achievementCode: Joi.string()
    .min(2)
    .max(64)
    .required()
    .messages({
      'any.required': 'achievementCode is required',
    }),
});