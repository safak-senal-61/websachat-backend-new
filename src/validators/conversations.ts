import Joi from 'joi';

const cuidRegex = /^c[0-9a-z]{24}$/i;
const cuidSchema = Joi.string().pattern(cuidRegex).required();

export const conversationIdParamSchema = Joi.object({
  conversationId: cuidSchema,
});

export const createConversationSchema = Joi.object({
  type: Joi.string().valid('DIRECT', 'GROUP').required(),
  title: Joi.string().max(200).allow(null, ''),
  participantIds: Joi.array().items(Joi.string().pattern(cuidRegex)).min(1).required(),
  metadata: Joi.object().optional(),
});

export const addParticipantSchema = Joi.object({
  userId: Joi.string().pattern(cuidRegex).required(),
  role: Joi.string().valid('MEMBER', 'ADMIN', 'OWNER').default('MEMBER'),
});

export const removeParticipantParamSchema = Joi.object({
  conversationId: Joi.string().pattern(cuidRegex).required(),
  userId: Joi.string().pattern(cuidRegex).required(),
});

export const listConversationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const markConversationReadSchema = Joi.object({
  lastReadMessageId: Joi.string().pattern(cuidRegex).required(),
});