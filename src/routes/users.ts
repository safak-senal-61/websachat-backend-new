// Dosya başı import kısmı
import { Router } from 'express';
import { UserController } from '../controllers/user';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadAvatar, handleUploadError } from '../middleware/upload';
import {
  updateProfileSchema,
  updateSettingsSchema,
  searchUsersSchema,
  getTopUsersSchema,
  blockUserSchema,
  userIdParamSchema,
} from '../validators/user';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Tip uyumluluğu için adapter yardımcıları
const adapt =
  <R extends Request>(fn: (req: R, res: Response) => Promise<void | Response>) =>
    async (req: Request, res: Response): Promise<void> => {
      await (fn as (req: Request, res: Response) => Promise<void | Response>)(req, res);
    };

const adaptMw =
  <R extends Request>(mw: (req: R, res: Response, next: NextFunction) => void | Promise<void>) =>
    (req: Request, res: Response, next: NextFunction): void | Promise<void> =>
      (mw as (req: Request, res: Response, next: NextFunction) => void | Promise<void>)(req, res, next);

// Auth middleware'leri uyarla
const authenticateMw: RequestHandler = adaptMw(authenticate);
const authorizeMw = (...roles: string[]): RequestHandler => adaptMw(authorize(...roles));

// Controller handler'larını uyarla (AuthRequest kullananlar için)
const getUserByIdHandler = adapt(UserController.getUserById);
const updateProfileHandler = adapt(UserController.updateProfile);
const updateAvatarHandler = adapt(UserController.updateAvatar);
const deleteAvatarHandler = adapt(UserController.deleteAvatar);
const updateSettingsHandler = adapt(UserController.updateSettings);
const searchUsersHandler = adapt(UserController.searchUsers);
const getTopUsersHandler = adapt(UserController.getTopUsers);
const toggleBlockUserHandler = adapt(UserController.toggleBlockUser);
const deleteAccountHandler = adapt(UserController.deleteAccount);
const getVirtualBalanceHandler = adapt(UserController.getVirtualBalance);

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         displayName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           example: 'John Doe'
 *         bio:
 *           type: string
 *           maxLength: 500
 *           example: 'I love streaming and gaming!'
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: '1990-01-01'
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           example: 'male'
 *         country:
 *           type: string
 *           maxLength: 100
 *           example: 'United States'
 *         city:
 *           type: string
 *           maxLength: 100
 *           example: 'New York'
 *         phone:
 *           type: string
 *           pattern: '^\+?[1-9]\d{1,14}$'
 *           example: '+1234567890'
 *         socialLinks:
 *           type: object
 *           properties:
 *             instagram:
 *               type: string
 *               format: uri
 *               example: 'https://instagram.com/johndoe'
 *             twitter:
 *               type: string
 *               format: uri
 *               example: 'https://twitter.com/johndoe'
 *             youtube:
 *               type: string
 *               format: uri
 *               example: 'https://youtube.com/johndoe'
 *             tiktok:
 *               type: string
 *               format: uri
 *               example: 'https://tiktok.com/@johndoe'
 *             website:
 *               type: string
 *               format: uri
 *               example: 'https://johndoe.com'
 *     
 *     UpdateSettingsRequest:
 *       type: object
 *       properties:
 *         privacy:
 *           type: object
 *           properties:
 *             profileVisibility:
 *               type: string
 *               enum: [public, friends, private]
 *               example: 'public'
 *             showOnlineStatus:
 *               type: boolean
 *               example: true
 *             allowDirectMessages:
 *               type: boolean
 *               example: true
 *             allowFollowRequests:
 *               type: boolean
 *               example: true
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: boolean
 *               example: true
 *             push:
 *               type: boolean
 *               example: true
 *             sms:
 *               type: boolean
 *               example: false
 *             newFollowers:
 *               type: boolean
 *               example: true
 *             liveStreamStart:
 *               type: boolean
 *               example: true
 *             gifts:
 *               type: boolean
 *               example: true
 *             comments:
 *               type: boolean
 *               example: true
 *             mentions:
 *               type: boolean
 *               example: true
 *         streaming:
 *           type: object
 *           properties:
 *             allowRecording:
 *               type: boolean
 *               example: true
 *             autoStartChat:
 *               type: boolean
 *               example: true
 *             moderationLevel:
 *               type: string
 *               enum: [low, medium, high]
 *               example: 'medium'
 *     
 *     UserSearchResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: '507f1f77bcf86cd799439011'
 *         username:
 *           type: string
 *           example: 'john_doe'
 *         displayName:
 *           type: string
 *           example: 'John Doe'
 *         avatar:
 *           type: string
 *           example: 'https://example.com/avatar.jpg'
 *         bio:
 *           type: string
 *           example: 'I love streaming!'
 *         isVerified:
 *           type: boolean
 *           example: false
 *         isOnline:
 *           type: boolean
 *           example: true
 *         followersCount:
 *           type: number
 *           example: 1250
 *         followingCount:
 *           type: number
 *           example: 180
 *         isLive:
 *           type: boolean
 *           example: false
 */

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users by username or display name
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search query (username or display name)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, followers, level, newest]
 *           default: relevance
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [verified, all, online, live]
 *           default: verified
 *         description: Filter users by verification, online presence, or live status
 *     responses:
 *       200:
 *         description: Users found successfully
 *       400:
 *         description: Invalid search parameters
 */
router.get('/search', validateQuery(searchUsersSchema), asyncHandler(searchUsersHandler));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: '507f1f77bcf86cd799439011'
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Profile is private
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validateParams(userIdParamSchema), asyncHandler(getUserByIdHandler));

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: 'Profile updated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/profile', authenticateMw, validate(updateProfileSchema), asyncHandler(updateProfileHandler));

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (max 5MB, jpg/png/gif/webp)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
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
 *                   example: 'Avatar uploaded successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     avatarUrl:
 *                       type: string
 *                       example: '/uploads/avatars/user123_1234567890.jpg'
 *       400:
 *         description: Invalid file format or size
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/avatar', authenticateMw, uploadAvatar.single('avatar'), handleUploadError, asyncHandler(updateAvatarHandler));

/**
 * @swagger
 * /api/users/avatar:
 *   delete:
 *     summary: Delete user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
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
 *                   example: 'Avatar deleted successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: No avatar to delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/avatar', authenticateMw, asyncHandler(deleteAvatarHandler));

/**
 * @swagger
 * /api/users/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsRequest'
 *     responses:
 *       200:
 *         description: Settings updated successfully
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
 *                   example: 'Settings updated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       properties:
 *                         privacy:
 *                           type: object
 *                         notifications:
 *                           type: object
 *                         streaming:
 *                           type: object
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/settings', authenticateMw, validate(updateSettingsSchema), asyncHandler(updateSettingsHandler));

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users by username or display name
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search query (username or display name)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, followers, level, newest]
 *           default: relevance
 *     responses:
 *       200:
 *         description: Users found successfully
 *       400:
 *         description: Invalid search parameters
 */
router.get('/search', validateQuery(searchUsersSchema), asyncHandler(searchUsersHandler));

/**
 * @swagger
 * /api/users/top:
 *   get:
 *     summary: Get top users (leaderboard)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [followers, gifts, streams, earnings]
 *           default: followers
 *         description: Leaderboard category
 *         example: 'followers'
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, all-time]
 *           default: all-time
 *         description: Time period
 *         example: 'monthly'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of top users to return
 *         example: 50
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [verified, all, online, live]
 *           default: verified
 *         description: Filter top users by verification, online presence, or live status
 *     responses:
 *       200:
 *         description: Top users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/UserSearchResult'
 *                           - type: object
 *                             properties:
 *                               rank:
 *                                 type: number
 *                                 example: 1
 *                               score:
 *                                 type: number
 *                                 example: 15420
 *                     category:
 *                       type: string
 *                       example: 'followers'
 *                     period:
 *                       type: string
 *                       example: 'monthly'
 */
router.get('/top', validateQuery(getTopUsersSchema), asyncHandler(getTopUsersHandler));

/**
 * @swagger
 * /api/users/{id}/block:
 *   post:
 *     summary: Block/unblock user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to block/unblock
 *         example: '507f1f77bcf86cd799439011'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [block, unblock]
 *                 example: 'block'
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: 'Violation of community guidelines'
 *               duration:
 *                 type: number
 *                 minimum: 1
 *                 description: Block duration in hours (optional, permanent if not specified)
 *                 example: 168
 *     responses:
 *       200:
 *         description: User blocked/unblocked successfully
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
 *                   example: 'User blocked successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: '507f1f77bcf86cd799439011'
 *                         isBlocked:
 *                           type: boolean
 *                           example: true
 *                         blockReason:
 *                           type: string
 *                           example: 'Violation of community guidelines'
 *                         blockExpiresAt:
 *                           type: string
 *                           format: date-time
 *                           example: '2024-01-15T10:30:00Z'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/block',
  authenticateMw,
  authorizeMw('admin', 'moderator'),
  validateParams(userIdParamSchema),
  validate(blockUserSchema),
  asyncHandler(toggleBlockUserHandler)
);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - confirmDeletion
 *             properties:
 *               password:
 *                 type: string
 *                 example: 'Password123'
 *               confirmDeletion:
 *                 type: string
 *                 enum: ['DELETE_MY_ACCOUNT']
 *                 example: 'DELETE_MY_ACCOUNT'
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: 'No longer using the platform'
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *                   example: 'Account deleted successfully'
 *       400:
 *         description: Invalid password or confirmation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/account', authenticateMw, asyncHandler(deleteAccountHandler));

/**
 * @swagger
 * /api/users/virtual-balance:
 *   get:
 *     summary: Get user's virtual balance (coins and diamonds)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Virtual balance retrieved successfully
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
 *                   example: 'Sanal bakiye başarıyla getirildi'
 *                 data:
 *                   type: object
 *                   properties:
 *                     coins:
 *                       type: integer
 *                       example: 100
 *                       description: 'Jeton bakiyesi'
 *                     diamonds:
 *                       type: integer
 *                       example: 25
 *                       description: 'Elmas bakiyesi (kuruş cinsinden)'
 *                     diamondBalanceTL:
 *                       type: string
 *                       example: '0.25'
 *                       description: 'Elmas bakiyesi TL formatında'
 *                     diamondBalanceFormatted:
 *                       type: string
 *                       example: '₺0.25'
 *                       description: 'Formatlanmış elmas bakiyesi'
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       example: '2024-01-15T10:30:00Z'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/virtual-balance', authenticateMw, asyncHandler(getVirtualBalanceHandler));

export default router;