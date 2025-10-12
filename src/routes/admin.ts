import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from '@/controllers/admin';
import { authenticate, authorize, type AuthRequest } from '@/middleware/auth';
import { validate, validateParams, validateQuery } from '@/middleware/validation';
import { getUsersQuerySchema, updateUserRoleSchema, userIdParamSchema } from '@/validators/admin';
import { streamIdParamSchema } from '@/validators/live';
import { getStreamsQuerySchema, updateStreamStatusSchema, updateStreamVisibilitySchema, featureStreamSchema } from '@/validators/admin';

const router = Router();

const adapt =
  (fn: (req: Request, res: Response) => Promise<void>) =>
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

export default router;