import Joi from 'joi';

export const getUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  q: Joi.string().trim().allow(''),
  role: Joi.string().valid('user', 'streamer', 'moderator', 'admin'),
  status: Joi.string().valid('active', 'inactive', 'banned'),
  sort: Joi.string().valid('createdAt', 'username', 'email').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const userIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('user', 'streamer', 'moderator', 'admin').required(),
});

export const getStreamsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  q: Joi.string().trim().allow(''),
  status: Joi.string().valid('live', 'scheduled', 'ended', 'paused'),
  visibility: Joi.string().valid('public', 'private', 'followers-only'),
  category: Joi.string().valid(
    'gaming', 'music', 'entertainment', 'education', 'sports',
    'technology', 'lifestyle', 'cooking', 'art', 'fitness',
    'travel', 'news', 'talk-show', 'comedy', 'other'
  ),
  sort: Joi.string().valid('createdAt', 'title', 'status').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const updateStreamStatusSchema = Joi.object({
  status: Joi.string().valid('scheduled', 'live', 'ended', 'paused').required(),
});

export const updateStreamVisibilitySchema = Joi.object({
  visibility: Joi.string().valid('public', 'private', 'followers-only').required(),
});

export const featureStreamSchema = Joi.object({
  featured: Joi.boolean().required(),
});