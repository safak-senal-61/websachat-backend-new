import Joi from 'joi';

export const partnersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const summariesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const unreadCountsQuerySchema = Joi.object({
  perConversation: Joi.boolean().default(false),
});

export const muteConversationSchema = Joi.object({
  muteUntil: Joi.string().isoDate().optional(),
  durationMinutes: Joi.number().integer().min(1).max(10080).optional(), // up to 7 days
}).or('muteUntil', 'durationMinutes');

export const notificationsToggleSchema = Joi.object({
  enabled: Joi.boolean().required(),
});