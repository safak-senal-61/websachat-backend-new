import Joi from 'joi';

export const streamIdParamSchema = Joi.object({
  streamId: Joi.string().required(),
});

export const messageIdParamSchema = Joi.object({
  messageId: Joi.string().required(),
});

export const sendMessageSchema = Joi.object({
  streamId: Joi.string().required(),
  content: Joi.string().min(1).max(1000).required(),
  type: Joi.string().valid('TEXT', 'EMOJI', 'STICKER', 'GIF').default('TEXT'),
  metadata: Joi.object().optional(),
});

export const getMessagesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  sortBy: Joi.string().valid('newest', 'oldest').default('newest'),
  type: Joi.string().valid('TEXT', 'EMOJI', 'STICKER', 'GIF').optional(),
  includeDeleted: Joi.boolean().default(false),
});

export const updateMessageSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required(),
  metadata: Joi.object().optional(),
});

export const deleteMessageSchema = Joi.object({
  reason: Joi.string().max(200).optional(),
});