import Joi from 'joi';

const cuidRegex = /^c[0-9a-z]{24}$/i;

export const roomIdParamSchema = Joi.object({
  roomId: Joi.string().pattern(cuidRegex).required(),
});

export const createRoomSchema = Joi.object({
  name: Joi.string().max(200).required(),
  description: Joi.string().max(500).allow('', null),
  visibility: Joi.string().valid('PUBLIC', 'PRIVATE').default('PUBLIC'),
  settings: Joi.object().optional(),
  metadata: Joi.object().optional(),
});

export const addRoomMemberSchema = Joi.object({
  userId: Joi.string().pattern(cuidRegex).required(),
  role: Joi.string().valid('MEMBER', 'MODERATOR', 'OWNER').default('MEMBER'),
});

export const removeRoomMemberParamSchema = Joi.object({
  roomId: Joi.string().pattern(cuidRegex).required(),
  userId: Joi.string().pattern(cuidRegex).required(),
});

export const sendRoomMessageSchema = Joi.object({
  content: Joi.string().max(5000).allow('', null),
  type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'STICKER', 'GIF', 'SYSTEM').default('TEXT'),
  metadata: Joi.object().optional(),
  attachments: Joi.object().optional(),
});

export const getRoomMessagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string().valid('newest', 'oldest').default('newest'),
  includeDeleted: Joi.boolean().default(false),
  type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'STICKER', 'GIF', 'SYSTEM').optional(),
});