import Joi from 'joi';

const cuidRegex = /^c[0-9a-z]{24}$/i;

// CUID veya 24-hex destekle (esneklik için)
const userIdSchema = Joi.alternatives().try(
  Joi.string().pattern(cuidRegex),
  Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
).required();

export const directUserIdParamSchema = Joi.object({
  userId: userIdSchema,
});

export const sendDirectMessageSchema = Joi.object({
  content: Joi.string().max(5000).allow('', null),
  type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'STICKER', 'GIF', 'SYSTEM').default('TEXT'),
  metadata: Joi.object().optional(),
  attachments: Joi.object().optional(),
});

export const getDirectMessagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string().valid('newest', 'oldest').default('newest'),
  includeDeleted: Joi.boolean().default(false),
  type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'STICKER', 'GIF', 'SYSTEM').optional(),
});

export const markDirectConversationReadSchema = Joi.object({
  lastReadMessageId: Joi.string().pattern(cuidRegex).required(),
});