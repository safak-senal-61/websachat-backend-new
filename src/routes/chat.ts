import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate as auth } from '@/middleware/auth';
import type { AuthRequest } from '@/middleware/auth';
import { validate, validateParams, validateQuery } from '@/middleware/validation';
import { ChatController } from '@/controllers/chat';
import {
  sendMessageSchema,
  getMessagesSchema,
  updateMessageSchema,
  deleteMessageSchema,
  streamIdParamSchema,
  messageIdParamSchema,
} from '@/validators/chat';

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

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: Chat and messaging endpoints
 *
 * components:
 *   schemas:
 *     ChatMessageRequest:
 *       type: object
 *       required:
 *         - streamId
 *         - content
 *       properties:
 *         streamId:
 *           type: string
 *         content:
 *           type: string
 *           maxLength: 1000
 *         type:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF]
 *           default: TEXT
 *         metadata:
 *           type: object
 *     ChatMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         authorId:
 *           type: string
 *         streamId:
 *           type: string
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF]
 *         metadata:
 *           type: object
 *         isEdited:
 *           type: boolean
 *         editedAt:
 *           type: string
 *           format: date-time
 *         isDeleted:
 *           type: boolean
 *         deletedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ChatMessageList:
 *       type: object
 *       properties:
 *         messages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChatMessage'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/chat/messages:
 *   post:
 *     summary: Yayın sohbetine mesaj gönder
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessageRequest'
 *     responses:
 *       201:
 *         description: Mesaj başarıyla gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/ChatMessage'
 */
router.post('/messages', authenticateMw, validate(sendMessageSchema), adaptAuth(ChatController.sendMessage));

/**
 * @swagger
 * /api/chat/messages/stream/{streamId}:
 *   get:
 *     summary: Yayın sohbetindeki mesajları getir (sayfalama)
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF]
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Mesajlar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChatMessageList'
 */
router.get(
  '/messages/stream/:streamId',
  validateParams(streamIdParamSchema),
  validateQuery(getMessagesSchema),
  adaptAuth(ChatController.getMessages)
);

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   patch:
 *     summary: Sohbet mesajını güncelle
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessageRequest'
 *     responses:
 *       200:
 *         description: Mesaj başarıyla güncellendi
 *   delete:
 *     summary: Sohbet mesajını sil
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteMessageRequest'
 *     responses:
 *       200:
 *         description: Mesaj başarıyla silindi
 */
router.patch(
  '/messages/:messageId',
  authenticateMw,
  validateParams(messageIdParamSchema),
  validate(updateMessageSchema),
  adaptAuth(ChatController.updateMessage)
);
router.delete(
  '/messages/:messageId',
  authenticateMw,
  validateParams(messageIdParamSchema),
  validate(deleteMessageSchema),
  adaptAuth(ChatController.deleteMessage)
);

export default router;