// top-level module imports
import { Router } from 'express';
import { getTopStreams, getStreamPerformance, getUsersAnalytics, getTopUsers, getRevenueAnalytics, getPlatformAnalytics, getRealtimeAnalytics, exportAnalytics } from '../controllers/analytics';
import { authenticate as auth, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import type { Request, Response, NextFunction } from 'express';

import { validateParams, validateQuery } from '../middleware/validation';
import {
  topStreamsSchema,
  streamPerformanceSchema,
  userAnalyticsSchema,
  topUsersSchema,
  revenueAnalyticsSchema,
  platformAnalyticsSchema,
  realTimeAnalyticsSchema,
  exportAnalyticsSchema,
  streamIdParamSchema,
} from '../validators/analytics';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     StreamAnalytics:
 *       type: object
 *       properties:
 *         totalStreams:
 *           type: number
 *           description: Total number of streams
 *         totalViewers:
 *           type: number
 *           description: Total viewers across all streams
 *         peakViewers:
 *           type: number
 *           description: Peak concurrent viewers
 *         averageViewers:
 *           type: number
 *           description: Average viewers per stream
 *         totalWatchTime:
 *           type: number
 *           description: Total watch time in minutes
 *         totalComments:
 *           type: number
 *           description: Total comments
 *         totalGifts:
 *           type: number
 *           description: Total gifts sent
 *         totalGiftsValue:
 *           type: number
 *           description: Total value of gifts
 *         totalReactions:
 *           type: number
 *           description: Total reactions
 *         averageEngagementRate:
 *           type: number
 *           description: Average engagement rate
 *
 *     UserAnalytics:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: number
 *           description: Total number of users
 *         activeUsers:
 *           type: number
 *           description: Active users in the period
 *         newUsers:
 *           type: number
 *           description: New users in the period
 *         totalStreams:
 *           type: number
 *           description: Total streams created by users
 *         totalComments:
 *           type: number
 *           description: Total comments by users
 *         totalGiftsSent:
 *           type: number
 *           description: Total gifts sent by users
 *         totalGiftsReceived:
 *           type: number
 *           description: Total gifts received by users
 *         totalGiftsSentValue:
 *           type: number
 *           description: Total value of gifts sent
 *         totalGiftsReceivedValue:
 *           type: number
 *           description: Total value of gifts received
 *
 *     RevenueAnalytics:
 *       type: object
 *       properties:
 *         totalRevenue:
 *           type: number
 *           description: Total revenue
 *         totalTransactions:
 *           type: number
 *           description: Total number of transactions
 *         averageTransactionValue:
 *           type: number
 *           description: Average transaction value
 *         revenueByType:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               amount:
 *                 type: number
 *
 *     PlatformAnalytics:
 *       type: object
 *       properties:
 *         users:
 *           $ref: '#/components/schemas/UserAnalytics'
 *         streams:
 *           $ref: '#/components/schemas/StreamAnalytics'
 *         revenue:
 *           $ref: '#/components/schemas/RevenueAnalytics'
 *         engagement:
 *           type: object
 *           properties:
 *             totalComments:
 *               type: number
 *             totalGifts:
 *               type: number
 *             totalReactions:
 *               type: number
 *
 *     RealTimeAnalytics:
 *       type: object
 *       properties:
 *         currentViewers:
 *           type: number
 *           description: Current total viewers
 *         chatActivity:
 *           type: number
 *           description: Chat messages in time window
 *         giftActivity:
 *           type: number
 *           description: Gifts sent in time window
 *         newFollowers:
 *           type: number
 *           description: New followers in time window
 *         timeWindow:
 *           type: string
 *           description: Time window for the data
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the data
 */

// Stream Analytics Routes
/**
 * @swagger
 * /api/analytics/streams:
 *   get:
 *     summary: Get stream analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: streamId
 *         schema:
 *           type: string
 *         description: Specific stream ID to analyze
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Specific user ID to analyze streams for
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly, yearly, all]
 *           default: daily
 *         description: Time period for analytics
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: UTC
 *         description: Timezone for date calculations
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, year]
 *         description: Group results by time period
 *     responses:
 *       200:
 *         description: Stream analytics retrieved successfully
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
 *                     analytics:
 *                       $ref: '#/components/schemas/StreamAnalytics'
 *                     period:
 *                       type: string
 *                     groupBy:
 *                       type: string
 *                     filters:
 *                       type: object
 */
// Express adapter utilities for controller handlers and middlewares
const adapt =
  (fn: (req: Request, res: Response) => Promise<void | Response>) =>
    async (req: Request, res: Response): Promise<void> => {
      await fn(req, res);
    };

const adaptMw = <R extends Request>(
  mw: (req: R, res: Response, next: NextFunction) => void | Promise<void>
) => (req: Request, res: Response, next: NextFunction): void | Promise<void> => {
    return mw(req as R, res, next);
  };

const authenticateMw = adaptMw(auth);
const authorizeMw: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void | Promise<void> =
  (...roles: string[]) => adaptMw(authorize(...roles));

// Wrap controller handlers
const getTopStreamsHandler = adapt(getTopStreams);
const getStreamPerformanceHandler = adapt(getStreamPerformance);
const getUsersAnalyticsHandler = adapt(getUsersAnalytics);
const getTopUsersHandler = adapt(getTopUsers);
const getRevenueAnalyticsHandler = adapt(getRevenueAnalytics);
const getPlatformAnalyticsHandler = adapt(getPlatformAnalytics);
const getRealtimeAnalyticsHandler = adapt(getRealtimeAnalytics);
const exportAnalyticsHandler = adapt(exportAnalytics);

/**
 * @swagger
 * /api/analytics/streams/top:
 *   get:
 *     summary: Get top performing streams
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/streams/top',
  authenticateMw,
  authorizeMw('admin', 'moderator', 'streamer'),
  validateQuery(topStreamsSchema),
  asyncHandler(getTopStreamsHandler)
);

/**
 * @swagger
 * /api/analytics/streams/{streamId}/performance:
 *   get:
 *     summary: Get detailed performance analytics for a specific stream
 *     tags: [Analytics]
 */
router.get(
  '/streams/:streamId/performance',
  authenticateMw,
  authorizeMw('admin', 'moderator', 'streamer'),
  validateParams(streamIdParamSchema),
  validateQuery(streamPerformanceSchema),
  asyncHandler(getStreamPerformanceHandler)
);

// User Analytics Routes
/**
 * @swagger
 * /api/analytics/users:
 *   get:
 *     summary: Get user analytics
 *     tags: [Analytics]
 */
router.get(
  '/users',
  authenticateMw,
  authorizeMw('admin', 'moderator'),
  validateQuery(userAnalyticsSchema),
  asyncHandler(getUsersAnalyticsHandler)
);

/**
 * @swagger
 * /api/analytics/users/top:
 *   get:
 *     summary: Get top users by various metrics
 *     tags: [Analytics]
 */
router.get(
  '/users/top',
  authenticateMw,
  authorizeMw('admin', 'moderator'),
  validateQuery(topUsersSchema),
  asyncHandler(getTopUsersHandler)
);

// Revenue Analytics Routes
/**
 * @swagger
 * /api/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     tags: [Analytics]
 */
router.get(
  '/revenue',
  authenticateMw,
  authorizeMw('admin', 'moderator'),
  validateQuery(revenueAnalyticsSchema),
  asyncHandler(getRevenueAnalyticsHandler)
);

// Platform Analytics Routes
/**
 * @swagger
 * /api/analytics/platform:
 *   get:
 *     summary: Get overall platform analytics
 *     tags: [Analytics]
 */
router.get(
  '/platform',
  authenticateMw,
  authorizeMw('admin', 'moderator'),
  validateQuery(platformAnalyticsSchema),
  asyncHandler(getPlatformAnalyticsHandler)
);

// Real-time Analytics Routes
/**
 * @swagger
 * /api/analytics/realtime:
 *   get:
 *     summary: Get real-time platform analytics
 *     tags: [Analytics]
 */
router.get(
  '/realtime',
  authenticateMw,
  authorizeMw('admin', 'moderator'),
  validateQuery(realTimeAnalyticsSchema),
  asyncHandler(getRealtimeAnalyticsHandler)
);

// Export Analytics Routes
/**
 * @swagger
 * /api/analytics/export:
 *   post:
 *     summary: Export analytics data
 *     tags: [Analytics]
 */
router.post(
  '/export',
  authenticateMw,
  authorizeMw('admin', 'moderator', 'streamer'),
  validateQuery(exportAnalyticsSchema),
  asyncHandler(exportAnalyticsHandler)
);

export default router;