import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate as auth } from '@/middleware/auth';
import type { AuthRequest } from '@/middleware/auth';
import { validate, validateParams, validateQuery } from '@/middleware/validation';
import * as ConversationsController from '@/controllers/conversations';
import {
  createConversationSchema,
  addParticipantSchema,
  removeParticipantParamSchema,
  listConversationsQuerySchema,
  markConversationReadSchema,
  conversationIdParamSchema,
} from '@/validators/conversations';
import {
  sendConversationMessageSchema,
  getConversationMessagesSchema,
  updateConversationMessageSchema,
  deleteConversationMessageSchema,
  messageIdParamSchema,
} from '@/validators/conversationMessages';

const router = Router();

const adaptAuth = (handler: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req as AuthRequest, res)).catch(next);
  };
};

const adaptMw = (
  mw: (req: AuthRequest, res: Response, next: NextFunction) => void | Promise<void>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(mw(req as AuthRequest, res, next)).catch(next);
  };
};

const authenticateMw = adaptMw(auth);

// Conversations
router.post('/', authenticateMw, validate(createConversationSchema), adaptAuth(ConversationsController.createConversation));
router.post('/:conversationId/participants', authenticateMw, validateParams(conversationIdParamSchema), validate(addParticipantSchema), adaptAuth(ConversationsController.addParticipant));
router.delete('/:conversationId/participants/:userId', authenticateMw, validateParams(removeParticipantParamSchema), adaptAuth(ConversationsController.removeParticipant));
router.get('/', authenticateMw, validateQuery(listConversationsQuerySchema), adaptAuth(ConversationsController.listConversations));
router.post('/:conversationId/read', authenticateMw, validateParams(conversationIdParamSchema), validate(markConversationReadSchema), adaptAuth(ConversationsController.markConversationRead));

// Conversation messages
router.post('/:conversationId/messages', authenticateMw, validateParams(conversationIdParamSchema), validate(sendConversationMessageSchema), adaptAuth(ConversationsController.sendMessage));
router.get('/:conversationId/messages', authenticateMw, validateParams(conversationIdParamSchema), validateQuery(getConversationMessagesSchema), adaptAuth(ConversationsController.getMessages));
router.patch('/messages/:messageId', authenticateMw, validateParams(messageIdParamSchema), validate(updateConversationMessageSchema), adaptAuth(ConversationsController.updateMessage));
router.delete('/messages/:messageId', authenticateMw, validateParams(messageIdParamSchema), validate(deleteConversationMessageSchema), adaptAuth(ConversationsController.deleteMessage));

export default router;