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
import * as ConversationsController from '@/controllers/conversations';
import {
  directUserIdParamSchema,
  sendDirectMessageSchema,
  getDirectMessagesQuerySchema,
  markDirectConversationReadSchema,
} from '@/validators/directMessages';
import { listConversationsQuerySchema } from '@/validators/conversations';

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
 *   - name: Direct Messages
 *     description: Direct messaging between users
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
 *     DirectMessageRequest:
 *       type: object
 *       required:
 *         - content
 *         - type
 *       properties:
 *         content:
 *           type: string
 *           maxLength: 1000
 *           description: Mesaj içeriği
 *           example: "Merhaba! Nasılsın?"
 *         type:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *           default: TEXT
 *           description: Mesaj tipi
 *         metadata:
 *           type: object
 *           description: Ek meta veriler
 *         attachments:
 *           type: object
 *           description: Dosya ekleri
 *     DirectMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Mesaj ID'si
 *         authorId:
 *           type: string
 *           description: Gönderen kullanıcı ID'si
 *         conversationId:
 *           type: string
 *           description: Konuşma ID'si
 *         content:
 *           type: string
 *           description: Mesaj içeriği
 *         type:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *           description: Mesaj tipi
 *         metadata:
 *           type: object
 *           description: Ek meta veriler
 *         attachments:
 *           type: object
 *           description: Dosya ekleri
 *         isEdited:
 *           type: boolean
 *           description: Düzenlenmiş mi?
 *         editedAt:
 *           type: string
 *           format: date-time
 *           description: Düzenlenme tarihi
 *         isDeleted:
 *           type: boolean
 *           description: Silinmiş mi?
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           description: Silinme tarihi
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Oluşturulma tarihi
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Güncellenme tarihi
 *     DirectMessageList:
 *       type: object
 *       properties:
 *         messages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DirectMessage'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *     MarkAsReadRequest:
 *       type: object
 *       properties:
 *         lastReadMessageId:
 *           type: string
 *           description: Son okunan mesaj ID'si (opsiyonel)
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Konuşma ID'si
 *         type:
 *           type: string
 *           enum: [DIRECT, GROUP]
 *           description: Konuşma tipi
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [MEMBER, ADMIN]
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *         lastMessage:
 *           $ref: '#/components/schemas/DirectMessage'
 *         unreadCount:
 *           type: integer
 *           description: Okunmamış mesaj sayısı
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ConversationList:
 *       type: object
 *       properties:
 *         conversations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Conversation'
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

/**
 * @swagger
 * /api/chat/direct-messages/{userId}:
 *   post:
 *     summary: Kullanıcıya direkt mesaj gönder
 *     description: Belirtilen kullanıcıya direkt mesaj gönderir. Konuşma yoksa otomatik oluşturur.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^(c[0-9a-z]{24}|[0-9a-fA-F]{24})$"
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^(c[0-9a-z]{24}|[0-9a-fA-F]{24})$"
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^(c[0-9a-z]{24}|[0-9a-fA-F]{24})$"
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;
 *         description: Hedef kullanıcının ID'si (CUID veya 24-hex format)
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectMessageRequest'
 *           examples:
 *             text_message:
 *               summary: Metin mesajı
 *               value:
 *                 content: "Merhaba! Nasılsın?"
 *                 type: "TEXT"
 *             emoji_message:
 *               summary: Emoji mesajı
 *               value:
 *                 content: "👋"
 *                 type: "EMOJI"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mesaj başarıyla gönderildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/DirectMessage'
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz istek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Kullanıcı bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Kullanıcıyla olan direkt mesajları getir
 *     description: Belirtilen kullanıcıyla olan direkt mesajları sayfalama ile getirir.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Silinmiş mesajları dahil et
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, EMOJI, STICKER, GIF, IMAGE, VIDEO, AUDIO, FILE]
 *         description: Mesaj tipine göre filtrele
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DirectMessageList'
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(sendDirectMessageSchema),
  adaptAuth(ConversationsController.sendDirectMessageByUserId)
);

router.get(
  '/direct-messages/:userId',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validateQuery(getDirectMessagesQuerySchema),
  adaptAuth(ConversationsController.getDirectMessagesByUserId)
);

/**
 * @swagger
 * /api/chat/conversations/{userId}/read:
 *   post:
 *     summary: Konuşmayı okundu olarak işaretle
 *     description: Belirtilen kullanıcıyla olan konuşmayı okundu olarak işaretler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(c[0-9a-z]{24}|[0-9a-fA-F]{24})

export default router;
 *         description: Karşı tarafın kullanıcı ID'si
 *         example: "cmh9qdkuh0004ma10vmplo6n0"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *           examples:
 *             mark_all_read:
 *               summary: Tüm mesajları okundu işaretle
 *               value: {}
 *             mark_until_message:
 *               summary: Belirli mesaja kadar okundu işaretle
 *               value:
 *                 lastReadMessageId: "cmh9qdkuh0004ma10vmplo6n1"
 *     responses:
 *       200:
 *         description: Konuşma başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Konuşma okundu olarak işaretlendi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       description: Güncel okunmamış mesaj sayısı
 *                       example: 0
 *       404:
 *         description: Kullanıcı veya konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/conversations/:userId/read',
  authenticateMw,
  validateParams(directUserIdParamSchema),
  validate(markDirectConversationReadSchema),
  adaptAuth(ConversationsController.markDirectConversationReadByUserId)
);

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Konuşma listesini getir
 *     description: Kullanıcının tüm konuşmalarını (direkt mesajlar ve grup sohbetleri) listeler.
 *     tags: [Direct Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına konuşma sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationList'
 */
// Alias for listing conversations
router.get(
  '/conversations',
  authenticateMw,
  validateQuery(listConversationsQuerySchema),
  adaptAuth(ConversationsController.listConversations)
);

export default router;