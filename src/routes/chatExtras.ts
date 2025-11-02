import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate as auth } from '@/middleware/auth';
import type { AuthRequest } from '@/middleware/auth';
import { validate, validateParams, validateQuery } from '@/middleware/validation';
import {
  listChatPartners,
  getConversationSummaries,
  getUnreadCounts,
  muteConversation,
  unmuteConversation,
  toggleConversationNotifications,
} from '@/controllers/chatExtras';
import {
  partnersQuerySchema,
  summariesQuerySchema,
  unreadCountsQuerySchema,
  muteConversationSchema,
  notificationsToggleSchema,
} from '@/validators/chatExtras';
import { conversationIdParamSchema } from '@/validators/conversations';

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
 *   - name: Chat Extras
 *     description: Gelişmiş chat listesi ve ayarları
 *
 * components:
 *   schemas:
 *     ChatPartner:
 *       type: object
 *       properties:
 *         partner:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             username:
 *               type: string
 *             displayName:
 *               type: string
 *             avatar:
 *               type: string
 *         conversationId:
 *           type: string
 *         lastMessage:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             senderId:
 *               type: string
 *             content:
 *               type: string
 *             type:
 *               type: string
 *               enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, SYSTEM]
 *             createdAt:
 *               type: string
 *               format: date-time
 *         unreadCount:
 *           type: integer
 *     ConversationSummary:
 *       type: object
 *       properties:
 *         conversation:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             type:
 *               type: string
 *               enum: [DIRECT, GROUP]
 *             title:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *         directPartner:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             username:
 *               type: string
 *             displayName:
 *               type: string
 *             avatar:
 *               type: string
 *         lastMessage:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             senderId:
 *               type: string
 *             content:
 *               type: string
 *             type:
 *               type: string
 *               enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, SYSTEM]
 *             createdAt:
 *               type: string
 *               format: date-time
 *         unreadCount:
 *           type: integer
 *     UnreadCounts:
 *       type: object
 *       properties:
 *         totalUnread:
 *           type: integer
 *         breakdown:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *               unreadCount:
 *                 type: integer
 */

/**
 * @swagger
 * /api/chat/partners:
 *   get:
 *     summary: DIRECT konuşmalardaki chat partnerlerini son mesaj ve zaman bilgisi ile listele
 *     tags: [Chat Extras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     partners:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ChatPartner'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/partners', authenticateMw, validateQuery(partnersQuerySchema), adaptAuth(listChatPartners));

/**
 * @swagger
 * /api/chat/conversations/summary:
 *   get:
 *     summary: Tüm konuşmalar için son mesaj ve okunmamış sayısı özetini getir
 *     tags: [Chat Extras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summaries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ConversationSummary'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/conversations/summary', authenticateMw, validateQuery(summariesQuerySchema), adaptAuth(getConversationSummaries));

/**
 * @swagger
 * /api/chat/conversations/unread-count:
 *   get:
 *     summary: Toplam okunmamış mesaj sayısını ve istenirse konuşma bazlı kırılımı getir
 *     tags: [Chat Extras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: perConversation
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UnreadCounts'
 */
router.get('/conversations/unread-count', authenticateMw, validateQuery(unreadCountsQuerySchema), adaptAuth(getUnreadCounts));

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/mute:
 *   post:
 *     summary: Konuşmayı sessize al
 *     tags: [Chat Extras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               muteUntil:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.post(
  '/conversations/:conversationId/mute',
  authenticateMw,
  validateParams(conversationIdParamSchema),
  validate(muteConversationSchema),
  adaptAuth(muteConversation)
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/unmute:
 *   post:
 *     summary: Konuşmayı sessizden çıkar
 *     tags: [Chat Extras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.post(
  '/conversations/:conversationId/unmute',
  authenticateMw,
  validateParams(conversationIdParamSchema),
  adaptAuth(unmuteConversation)
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/notifications-toggle:
 *   post:
 *     summary: Konuşma bildirimlerini aç/kapat
 *     tags: [Chat Extras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.post(
  '/conversations/:conversationId/notifications-toggle',
  authenticateMw,
  validateParams(conversationIdParamSchema),
  validate(notificationsToggleSchema),
  adaptAuth(toggleConversationNotifications)
);

export default router;