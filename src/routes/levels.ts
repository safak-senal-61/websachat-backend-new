import { Router } from 'express';
import type { Request, Response } from 'express'; // NextFunction kaldırıldı
import { validateQuery } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { leaderboardQuerySchema } from '@/validators/levels';
import { getGlobalLeaderboard } from '@/controllers/user/leaderboard';

const router = Router();

const adapt =
  <R extends Request>(fn: (req: R, res: Response) => Promise<void | Response>) =>
    async (req: Request, res: Response): Promise<void> => {
      await (fn as (req: Request, res: Response) => Promise<void | Response>)(req, res);
    };

/**
 * @swagger
 * tags:
 *   - name: Levels
 *     description: Level ve liderlik tablosu uçları
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           example: "ck1234567890abcdefghijkl"
 *         displayName:
 *           type: string
 *           example: "Jane Doe"
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: "https://cdn.example.com/avatar.jpg"
 *         level:
 *           type: integer
 *           example: 12
 *         xp:
 *           type: integer
 *           example: 45230
 *         verified:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /api/levels/leaderboard:
 *   get:
 *     summary: Global liderlik tablosu (level/xp sıralı)
 *     tags: [Levels]
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [level, xp]
 *           default: level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
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
 *                     sort:
 *                       type: string
 *                     limit:
 *                       type: integer
 *                     entries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LeaderboardEntry'
 */
router.get('/leaderboard', validateQuery(leaderboardQuerySchema), asyncHandler(adapt(getGlobalLeaderboard)));

export default router;