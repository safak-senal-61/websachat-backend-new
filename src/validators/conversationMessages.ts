import Joi from 'joi';

export const conversationIdParamSchema = Joi.object({
  // Prisma CUID: 'c' ile başlar ve 24 ek alfanümerik karakter içerir
  conversationId: Joi.string().pattern(/^c[0-9a-z]{24}$/i).required(),
});

export const messageIdParamSchema = Joi.object({
  // Prisma CUID: 'c' ile başlar ve 24 ek alfanümerik karakter içerir
  messageId: Joi.string().pattern(/^c[0-9a-z]{24}$/i).required(),
});

export const sendConversationMessageSchema = Joi.object({
  content: Joi.string().max(5000).allow('', null),
  type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'STICKER', 'GIF', 'SYSTEM').default('TEXT'),
  metadata: Joi.object().optional(),
  attachments: Joi.object().optional(),
});

export const getConversationMessagesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string().valid('newest', 'oldest').default('newest'),
  includeDeleted: Joi.boolean().default(false),
  type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'STICKER', 'GIF', 'SYSTEM').optional(),
});

export const updateConversationMessageSchema = Joi.object({
  content: Joi.string().max(5000).required(),
  metadata: Joi.object().optional(),
});

export const deleteConversationMessageSchema = Joi.object({
  reason: Joi.string().max(500).allow('', null),
});