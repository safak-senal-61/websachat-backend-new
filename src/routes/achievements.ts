import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate, authorize, type AuthRequest } from '@/middleware/auth';
import { validate, validateParams } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { userIdParamSchema } from '@/validators/user';
import { grantAchievementSchema } from '@/validators/achievements';
import { listUserAchievements, grantAchievement } from '@/controllers/user/achievements';

const router = Router();

// Adapt helpers to bridge AuthRequest-based handlers/middleware
const adapt =
  <R extends Request>(fn: (req: R, res: Response) => Promise<void | Response>) =>
    async (req: Request, res: Response): Promise<void> => {
      await (fn as (req: Request, res: Response) => Promise<void | Response>)(req, res);
    };
const adaptMw = <R extends Request>(mw: (req: R, res: Response, next: NextFunction) => void | Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void | Promise<void> =>
    (mw as (req: Request, res: Response, next: NextFunction) => void | Promise<void>)(req, res, next);
const authenticateMw: RequestHandler = adaptMw<AuthRequest>(authenticate);
const authorizeAdminMw: RequestHandler = adaptMw<AuthRequest>(authorize('admin'));

/**
 * @swagger
 * tags:
 *   - name: Achievements
 *     description: Kullanıcı başarımları uçları
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Achievement:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           example: "first_stream"
 *         title:
 *           type: string
 *           example: "İlk Yayın"
 *         description:
 *           type: string
 *           example: "İlk kez canlı yayına çıktın."
 *         iconUrl:
 *           type: string
 *           example: "https://cdn.example.com/achievements/first_stream.png"
 *         xpReward:
 *           type: integer
 *           example: 250
 *         progress:
 *           type: integer
 *           example: 100
 *         earnedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/achievements/user/{id}:
 *   get:
 *     summary: Kullanıcının kazandığı başarımları getir
 *     tags: [Achievements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                     achievements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Achievement'
 */
router.get('/user/:id', validateParams(userIdParamSchema), asyncHandler(adapt(listUserAchievements)));

/**
 * @swagger
 * /api/achievements/grant:
 *   post:
 *     summary: Kullanıcıya achievement ver (admin)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, achievementCode]
 *             properties:
 *               userId:
 *                 type: string
 *               achievementCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Achievement verildi
 */
router.post('/grant', authenticateMw, authorizeAdminMw, validate(grantAchievementSchema), asyncHandler(adapt(grantAchievement)));

export default router;