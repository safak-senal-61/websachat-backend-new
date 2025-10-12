import { Router } from 'express';
import { SocialController } from '../controllers/social';
import { authenticate as auth } from '../middleware/auth';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import {
  followUserSchema,
  getFollowersSchema,
  blockUserSchema,
  sendGiftSchema,
  getGiftHistorySchema,
  getTopGiftersSchema,
  createCommentSchema,
  updateCommentSchema,
  getCommentsSchema,
  moderateCommentSchema,
  reportCommentSchema,
  addReactionSchema,
  getReactionsSchema,
  userIdParamSchema,
  commentIdParamSchema,
  streamIdParamSchema,
} from '../validators/social';

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuthRequest } from '../middleware/auth';

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
 * components:
 *   schemas:
 *     FollowRequest:
 *       type: object
 *       properties:
 *         notificationsEnabled:
 *           type: boolean
 *           default: true
 *           description: Bildirimler etkin mi
 *     
 *     BlockUserRequest:
 *       type: object
 *       properties:
 *         reason:
 *           type: string
 *           description: Engelleme sebebi
 *     
 *     SendGiftRequest:
 *       type: object
 *       required:
 *         - receiverId
 *         - giftType
 *       properties:
 *         receiverId:
 *           type: string
 *           description: Hediye alıcısının ID'si
 *         streamId:
 *           type: string
 *           description: Yayın ID'si (opsiyonel)
 *         giftType:
 *           type: string
 *           enum: [rose, heart, diamond, crown, car, yacht, rocket, fireworks, rainbow, unicorn, dragon, phoenix, galaxy, treasure, castle, throne, meteor, comet, star]
 *           description: Hediye türü
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 1
 *           description: Hediye miktarı
 *         message:
 *           type: string
 *           maxLength: 200
 *           description: Hediye mesajı
 *         isAnonymous:
 *           type: boolean
 *           default: false
 *           description: Anonim hediye mi
 *         isPublic:
 *           type: boolean
 *           default: true
 *           description: Herkese açık hediye mi
 *     
 *     CreateCommentRequest:
 *       type: object
 *       required:
 *         - streamId
 *         - content
 *       properties:
 *         streamId:
 *           type: string
 *           description: Yayın ID'si
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *           description: Yorum içeriği
 *         type:
 *           type: string
 *           enum: [text, emoji, sticker, gif]
 *           default: text
 *           description: Yorum türü
 *         parentCommentId:
 *           type: string
 *           description: Üst yorum ID'si (yanıt için)
 *         metadata:
 *           type: object
 *           description: Yorum metadata'sı
 *     
 *     UpdateCommentRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *           description: Yeni yorum içeriği
 *     
 *     ModerateCommentRequest:
 *       type: object
 *       required:
 *         - action
 *       properties:
 *         action:
 *           type: string
 *           enum: [pin, unpin, hide, unhide, delete, approve, flag]
 *           description: Moderasyon eylemi
 *         reason:
 *           type: string
 *           description: Moderasyon sebebi
 *     
 *     ReportCommentRequest:
 *       type: object
 *       required:
 *         - reason
 *       properties:
 *         reason:
 *           type: string
 *           enum: [spam, harassment, inappropriate, violence, hate_speech, misinformation, copyright, other]
 *           description: Şikayet sebebi
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Şikayet açıklaması
 *     
 *     AddReactionRequest:
 *       type: object
 *       required:
 *         - targetId
 *         - targetType
 *         - reactionType
 *       properties:
 *         targetId:
 *           type: string
 *           description: Hedef ID'si
 *         targetType:
 *           type: string
 *           enum: [stream, comment, user, gift]
 *           description: Hedef türü
 *         reactionType:
 *           type: string
 *           enum: [like, love, laugh, angry, sad, wow, fire, heart_eyes, clap, thumbs_up, thumbs_down, custom]
 *           description: Tepki türü
 *         intensity:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           default: 3
 *           description: Tepki yoğunluğu
 *         position:
 *           type: object
 *           properties:
 *             x:
 *               type: number
 *             y:
 *               type: number
 *           description: Tepki pozisyonu
 *         customEmoji:
 *           type: string
 *           description: Özel emoji
 *         isAnonymous:
 *           type: boolean
 *           default: false
 *           description: Anonim tepki mi
 *         duration:
 *           type: integer
 *           minimum: 1000
 *           maximum: 10000
 *           default: 2000
 *           description: Tepki süresi (ms)
 *     
 *     FollowResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             follower:
 *               type: string
 *             following:
 *               type: string
 *             notificationsEnabled:
 *               type: boolean
 *             createdAt:
 *               type: string
 *               format: date-time
 *     
 *     GiftResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             sender:
 *               type: string
 *             receiver:
 *               type: string
 *             giftType:
 *               type: string
 *             giftName:
 *               type: string
 *             giftIcon:
 *               type: string
 *             value:
 *               type: number
 *             quantity:
 *               type: integer
 *             totalValue:
 *               type: number
 *             status:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *     
 *     CommentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             author:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 avatar:
 *                   type: string
 *                 isVerified:
 *                   type: boolean
 *             stream:
 *               type: string
 *             content:
 *               type: string
 *             type:
 *               type: string
 *             reactions:
 *               type: object
 *             replyCount:
 *               type: integer
 *             isPinned:
 *               type: boolean
 *             createdAt:
 *               type: string
 *               format: date-time
 *     
 *     ReactionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             user:
 *               type: string
 *             target:
 *               type: string
 *             targetType:
 *               type: string
 *             reactionType:
 *               type: string
 *             intensity:
 *               type: integer
 *             position:
 *               type: object
 *             createdAt:
 *               type: string
 *               format: date-time
 */

// Follow routes
/**
 * @swagger
 * /api/social/follow/{userId}:
 *   post:
 *     summary: Kullanıcıyı takip et
 *     tags: [Social - Follow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Takip edilecek kullanıcının ID'si
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FollowRequest'
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla takip edildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowResponse'
 *       400:
 *         description: Geçersiz istek
 *       404:
 *         description: Kullanıcı bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/follow/:userId', authenticateMw, validateParams(userIdParamSchema), validate(followUserSchema), adaptAuth(SocialController.followUser));

/**
 * @swagger
 * /api/social/unfollow/{userId}:
 *   delete:
 *     summary: Kullanıcıyı takipten çıkar
 *     tags: [Social - Follow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Takipten çıkarılacak kullanıcının ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı takipten çıkarıldı
 *       404:
 *         description: Takip ilişkisi bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.delete('/unfollow/:userId', authenticateMw, validateParams(userIdParamSchema), adaptAuth(SocialController.unfollowUser));

/**
 * @swagger
 * /api/social/followers/{userId}:
 *   get:
 *     summary: Kullanıcının takipçilerini getir
 *     tags: [Social - Follow]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcının ID'si
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Sayfa başına öğe sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama terimi
 *     responses:
 *       200:
 *         description: Takipçiler başarıyla getirildi
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/followers/:userId', validateParams(userIdParamSchema), validateQuery(getFollowersSchema), adaptAuth(SocialController.getFollowers));

/**
 * @swagger
 * /api/social/following/{userId}:
 *   get:
 *     summary: Kullanıcının takip ettiklerini getir
 *     tags: [Social - Follow]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcının ID'si
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Sayfa başına öğe sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama terimi
 *     responses:
 *       200:
 *         description: Takip edilenler başarıyla getirildi
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/following/:userId', validateParams(userIdParamSchema), validateQuery(getFollowersSchema), adaptAuth(SocialController.getFollowing));

/**
 * @swagger
 * /api/social/block/{userId}:
 *   post:
 *     summary: Kullanıcıyı engelle
 *     tags: [Social - Follow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Engellenecek kullanıcının ID'si
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockUserRequest'
 *     responses:
 *       200:
 *         description: Kullanıcı başarıyla engellendi
 *       400:
 *         description: Geçersiz istek
 *       404:
 *         description: Kullanıcı bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/block/:userId', authenticateMw, validateParams(userIdParamSchema), validate(blockUserSchema), adaptAuth(SocialController.blockUser));

// Gift routes
/**
 * @swagger
 * /api/social/gifts/send:
 *   post:
 *     summary: Hediye gönder
 *     tags: [Gifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendGiftRequest'
 *     responses:
 *       201:
 *         description: Hediye başarıyla gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GiftResponse'
 *       400:
 *         description: Geçersiz istek veya yetersiz bakiye
 *       404:
 *         description: Alıcı bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/gifts/send', authenticateMw, validate(sendGiftSchema), adaptAuth(SocialController.sendGift));

/**
 * @swagger
 * /api/social/gifts/history:
 *   get:
 *     summary: Hediye geçmişini getir
 *     tags: [Gifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, sent, received]
 *           default: all
 *         description: Hediye türü
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Sayfa başına öğe sayısı
 *       - in: query
 *         name: giftType
 *         schema:
 *           type: string
 *         description: Hediye türü filtresi
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
 *     responses:
 *       200:
 *         description: Hediye geçmişi başarıyla getirildi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/gifts/history', authenticateMw, validateQuery(getGiftHistorySchema), adaptAuth(SocialController.getGiftHistory));

/**
 * @swagger
 * /api/social/gifts/top-gifters:
 *   get:
 *     summary: En çok hediye gönderenleri getir
 *     tags: [Gifts]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, all]
 *           default: monthly
 *         description: Zaman periyodu
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sonuç sayısı
 *     responses:
 *       200:
 *         description: En çok hediye göndericiler başarıyla getirildi
 */
router.get('/gifts/top-gifters', validateQuery(getTopGiftersSchema), SocialController.getTopGifters);

/**
 * @swagger
 * /api/social/gifts/top-receivers:
 *   get:
 *     summary: En çok hediye alanları getir
 *     tags: [Gifts]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, all]
 *           default: monthly
 *         description: Zaman periyodu
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sonuç sayısı
 *     responses:
 *       200:
 *         description: En çok hediye alıcılar başarıyla getirildi
 */
router.get('/gifts/top-receivers', validateQuery(getTopGiftersSchema), SocialController.getTopReceivers);

// Comment routes
/**
 * @swagger
 * /api/social/comments:
 *   post:
 *     summary: Yorum oluştur
 *     tags: [Social - Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       201:
 *         description: Yorum başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         description: Geçersiz istek
 *       404:
 *         description: Yayın bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/comments', authenticateMw, validate(createCommentSchema), adaptAuth(SocialController.createComment));

/**
 * @swagger
 * /api/social/comments/stream/{streamId}:
 *   get:
 *     summary: Yayın yorumlarını getir
 *     tags: [Social - Comments]
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Yayın ID'si
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Sayfa başına öğe sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, popular]
 *           default: newest
 *         description: Sıralama türü
 *       - in: query
 *         name: includeReplies
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Yanıtları dahil et
 *     responses:
 *       200:
 *         description: Yorumlar başarıyla getirildi
 *       404:
 *         description: Yayın bulunamadı
 */
router.get('/comments/stream/:streamId', validateParams(streamIdParamSchema), validateQuery(getCommentsSchema), SocialController.getComments);

/**
 * @swagger
 * /api/social/comments/{commentId}:
 *   put:
 *     summary: Yorumu güncelle
 *     tags: [Social - Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Yorum ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCommentRequest'
 *     responses:
 *       200:
 *         description: Yorum başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         description: Geçersiz istek
 *       403:
 *         description: Yetki yok
 *       404:
 *         description: Yorum bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 *   delete:
 *     summary: Yorumu sil
 *     tags: [Social - Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Yorum ID'si
 *     responses:
 *       200:
 *         description: Yorum başarıyla silindi
 *       403:
 *         description: Yetki yok
 *       404:
 *         description: Yorum bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.put('/comments/:commentId', authenticateMw, validateParams(commentIdParamSchema), validate(updateCommentSchema), adaptAuth(SocialController.updateComment));
router.delete('/comments/:commentId', authenticateMw, validateParams(commentIdParamSchema), adaptAuth(SocialController.deleteComment));

/**
 * @swagger
 * /api/social/comments/{commentId}/moderate:
 *   post:
 *     summary: Yorumu modere et
 *     tags: [Social - Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Yorum ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerateCommentRequest'
 *     responses:
 *       200:
 *         description: Moderasyon eylemi başarıyla uygulandı
 *       400:
 *         description: Geçersiz istek
 *       403:
 *         description: Moderasyon yetkisi yok
 *       404:
 *         description: Yorum bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/comments/:commentId/moderate', authenticateMw, validateParams(commentIdParamSchema), validate(moderateCommentSchema), adaptAuth(SocialController.moderateComment));

/**
 * @swagger
 * /api/social/comments/{commentId}/report:
 *   post:
 *     summary: Yorumu şikayet et
 *     tags: [Social - Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Yorum ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportCommentRequest'
 *     responses:
 *       200:
 *         description: Yorum başarıyla şikayet edildi
 *       400:
 *         description: Geçersiz istek veya zaten şikayet edilmiş
 *       404:
 *         description: Yorum bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/comments/:commentId/report', authenticateMw, validateParams(commentIdParamSchema), validate(reportCommentSchema), adaptAuth(SocialController.reportComment));

// Reaction routes
/**
 * @swagger
 * /api/social/reactions:
 *   post:
 *     summary: Tepki ekle
 *     tags: [Social - Reactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddReactionRequest'
 *     responses:
 *       201:
 *         description: Tepki başarıyla eklendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReactionResponse'
 *       200:
 *         description: Tepki güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReactionResponse'
 *       400:
 *         description: Geçersiz istek
 *       404:
 *         description: Hedef bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/reactions', authenticateMw, validate(addReactionSchema), adaptAuth(SocialController.addReaction));

/**
 * @swagger
 * /api/social/reactions/{targetType}/{targetId}:
 *   delete:
 *     summary: Tepkiyi kaldır
 *     tags: [Social - Reactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stream, comment, user, gift]
 *         description: Hedef türü
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hedef ID'si
 *     responses:
 *       200:
 *         description: Tepki başarıyla kaldırıldı
 *       404:
 *         description: Tepki bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 *   get:
 *     summary: Tepkileri getir
 *     tags: [Social - Reactions]
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stream, comment, user, gift]
 *         description: Hedef türü
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hedef ID'si
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Sayfa başına öğe sayısı
 *       - in: query
 *         name: reactionType
 *         schema:
 *           type: string
 *         description: Tepki türü filtresi
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
 *     responses:
 *       200:
 *         description: Tepkiler başarıyla getirildi
 */
router.delete('/reactions/:targetType/:targetId', authenticateMw, adaptAuth(SocialController.removeReaction));
router.get('/reactions/:targetType/:targetId', validateQuery(getReactionsSchema), SocialController.getReactions);

/**
 * @swagger
 * /api/social/reactions/{targetType}/{targetId}/stats:
 *   get:
 *     summary: Tepki istatistiklerini getir
 *     tags: [Social - Reactions]
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stream, comment, user, gift]
 *         description: Hedef türü
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hedef ID'si
 *     responses:
 *       200:
 *         description: Tepki istatistikleri başarıyla getirildi
 */
router.get('/reactions/:targetType/:targetId/stats', SocialController.getReactionStats);

/**
 * @swagger
 * /api/social/reactions/{targetType}/{targetId}/live:
 *   get:
 *     summary: Canlı tepkileri getir
 *     tags: [Social - Reactions]
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stream, comment, user, gift]
 *         description: Hedef türü
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hedef ID'si
 *       - in: query
 *         name: lastTimestamp
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Son zaman damgası
 *     responses:
 *       200:
 *         description: Canlı tepkiler başarıyla getirildi
 */
router.get('/reactions/:targetType/:targetId/live', SocialController.getLiveReactions);

export default router;