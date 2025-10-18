import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from '@/controllers/admin';
import { authenticate, authorize, type AuthRequest } from '@/middleware/auth';
import { validate, validateParams, validateQuery } from '@/middleware/validation';
import { getUsersQuerySchema, updateUserRoleSchema, userIdParamSchema } from '@/validators/admin';
import { streamIdParamSchema } from '@/validators/live';
import { getStreamsQuerySchema, updateStreamStatusSchema, updateStreamVisibilitySchema, featureStreamSchema } from '@/validators/admin';

const router = Router();

const adapt =
  (fn: (req: Request, res: Response) => Promise<void | Response>) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await fn(req, res);
      } catch (err) {
        next(err);
      }
    };

const adaptMw = <R extends Request>(
  mw: (req: R, res: Response, next: NextFunction) => void | Promise<void>
) =>
    (req: Request, res: Response, next: NextFunction): void | Promise<void> =>
      mw(req as R, res, next);

const authenticateMw = adaptMw<AuthRequest>(authenticate);
const authorizeAdminMw = adaptMw<AuthRequest>(authorize('admin'));

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Administrative endpoints
 */

/**
 * @swagger
 * /api/admin/overview/stats:
 *   get:
 *     summary: Get system overview statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview stats returned
 */
router.get('/overview/stats', authenticateMw, authorizeAdminMw, adapt(AdminController.getOverviewStats));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List users with admin filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, streamer, moderator, admin]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, banned]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, username, email]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Users listed
 */
router.get('/users', authenticateMw, authorizeAdminMw, validateQuery(getUsersQuerySchema), adapt(AdminController.getUsers));

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Update user role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, streamer, moderator, admin]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch('/users/:id/role', authenticateMw, authorizeAdminMw, validateParams(userIdParamSchema), validate(updateUserRoleSchema), adapt(AdminController.updateUserRole));

/**
 * @swagger
 * /api/admin/streams:
 *   get:
 *     summary: List streams with admin filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [live, scheduled, ended, paused] }
 *       - in: query
 *         name: visibility
 *         schema: { type: string, enum: [public, private, followers-only] }
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [gaming, music, entertainment, education, sports, technology, lifestyle, cooking, art, fitness, travel, news, talk-show, comedy, other]
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [createdAt, title, status] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Streams listed
 */
router.get('/streams', authenticateMw, authorizeAdminMw, validateQuery(getStreamsQuerySchema), adapt(AdminController.getStreams));

/**
 * @swagger
 * /api/admin/streams/{id}/status:
 *   patch:
 *     summary: Update stream status (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, live, ended, paused]
 *     responses:
 *       200:
 *         description: Stream status updated
 */
router.patch('/streams/:id/status', authenticateMw, authorizeAdminMw, validateParams(streamIdParamSchema), validate(updateStreamStatusSchema), adapt(AdminController.updateStreamStatus));

/**
 * @swagger
 * /api/admin/streams/{id}/visibility:
 *   patch:
 *     summary: Update stream visibility (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visibility]
 *             properties:
 *               visibility:
 *                 type: string
 *                 enum: [public, private, followers-only]
 *     responses:
 *       200:
 *         description: Stream visibility updated
 */
router.patch('/streams/:id/visibility', authenticateMw, authorizeAdminMw, validateParams(streamIdParamSchema), validate(updateStreamVisibilitySchema), adapt(AdminController.updateStreamVisibility));

/**
 * @swagger
 * /api/admin/streams/{id}/feature:
 *   patch:
 *     summary: Feature/unfeature a stream (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [featured]
 *             properties:
 *               featured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Stream feature flag updated
 */
router.patch('/streams/:id/feature', authenticateMw, authorizeAdminMw, validateParams(streamIdParamSchema), validate(featureStreamSchema), adapt(AdminController.featureStream));

/**
 * @swagger
 * /api/admin/streams/{id}:
 *   delete:
 *     summary: Delete a stream (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Stream deleted
 */
router.delete('/streams/:id', authenticateMw, authorizeAdminMw, validateParams(streamIdParamSchema), adapt(AdminController.deleteStream));

/**
 * @swagger
 * /api/admin/gifts/catalog:
 *   get:
 *     summary: Get gift catalog (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gift catalog returned
 */
router.get('/gifts/catalog', authenticateMw, authorizeAdminMw, adapt(AdminController.getGiftCatalog));

/**
 * @swagger
 * /api/admin/gifts/catalog:
 *   put:
 *     summary: Update gift catalog (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gift catalog updated
 */
router.put('/gifts/catalog', authenticateMw, authorizeAdminMw, adapt(AdminController.updateGiftCatalog));

/**
 * @swagger
 * /api/admin/gifts:
 *   post:
 *     summary: Add new gift (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gift added
 */
router.post('/gifts', authenticateMw, authorizeAdminMw, adapt(AdminController.addGift));

/**
 * @swagger
 * /api/admin/gifts/{id}:
 *   patch:
 *     summary: Update gift (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gift updated
 */
router.patch('/gifts/:id', authenticateMw, authorizeAdminMw, adapt(AdminController.updateGift));

/**
 * @swagger
 * /api/admin/gifts/{id}:
 *   delete:
 *     summary: Delete gift (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gift deleted
 */
router.delete('/gifts/:id', authenticateMw, authorizeAdminMw, adapt(AdminController.deleteGift));

/**
 * @swagger
 * /api/admin/commission/summary:
 *   get:
 *     summary: Get commission summary (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Commission summary returned
 */
router.get('/commission/summary', authenticateMw, authorizeAdminMw, adapt(AdminController.getCommissionSummary));

/**
 * @swagger
 * /api/admin/commission/report:
 *   get:
 *     summary: Get commission report (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Commission report returned
 */
router.get('/commission/report', authenticateMw, authorizeAdminMw, adapt(AdminController.getCommissionReport));

/**
 * @swagger
 * /api/admin/gifts/statistics:
 *   get:
 *     summary: Get gift statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gift statistics returned
 */
router.get('/gifts/statistics', authenticateMw, authorizeAdminMw, adapt(AdminController.getGiftStatistics));

/**
 * @swagger
 * /api/admin/levels/settings:
 *   get:
 *     summary: Get level settings (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Level settings returned
 */
router.get('/levels/settings', authenticateMw, authorizeAdminMw, adapt(AdminController.getLevelSettings));

/**
 * @swagger
 * /api/admin/levels/settings:
 *   put:
 *     summary: Update level settings (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Level settings updated
 */
router.put('/levels/settings', authenticateMw, authorizeAdminMw, adapt(AdminController.updateLevelSettings));

/**
 * @swagger
 * /api/admin/levels/users:
 *   get:
 *     summary: Get user level statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User level statistics returned
 */
router.get('/levels/users', authenticateMw, authorizeAdminMw, adapt(AdminController.getUserLevelStats));

/**
 * @swagger
 * /api/admin/levels/users/{userId}:
 *   patch:
 *     summary: Update user level manually (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User level updated
 */
router.patch('/levels/users/:userId', authenticateMw, authorizeAdminMw, adapt(AdminController.updateUserLevel));

/**
 * @swagger
 * /api/admin/levels/calculate:
 *   get:
 *     summary: Calculate level from XP (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Level calculation returned
 */
router.get('/levels/calculate', authenticateMw, authorizeAdminMw, adapt(AdminController.calculateLevelFromXp));

/**
 * @swagger
 * /api/admin/gift/economy:
 *   get:
 *     summary: Get gift economy settings (admin only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Gift economy settings returned
 *   put:
 *     summary: Update gift economy settings (admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coin_kurus:
 *                 type: integer
 *               commission_rate:
 *                 type: number
 *                 format: float
 *                 description: 0 to 1
 *     responses:
 *       200:
 *         description: Gift economy updated
 */
router.get('/gift/economy', authenticateMw, authorizeAdminMw, adapt(AdminController.getGiftEconomy));
router.put('/gift/economy', authenticateMw, authorizeAdminMw, adapt(AdminController.updateGiftEconomy));

export default router;