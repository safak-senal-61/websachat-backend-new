import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { LiveController } from '@/controllers/live';
import { authenticate } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate, validateParams, validateQuery } from '@/middleware/validation';
import {
  createStreamSchema,
  updateStreamSchema,
  searchStreamsSchema,
  streamIdParamSchema,
  joinStreamSchema,
  moderateStreamSchema,
  streamAnalyticsSchema,
  getTopStreamsSchema,
  reportStreamSchema,
} from '@/validators/live';

const router = Router();

// Adapt helpers: AuthRequest tabanlı handler/middleware’ları Express Request ile uyumlu hale getirir
const adapt =
  <R extends Request>(fn: (req: R, res: Response) => Promise<void | Response>) =>
    async (req: Request, res: Response): Promise<void> => {
      await (fn as (req: Request, res: Response) => Promise<void | Response>)(req, res);
    };

const adaptMw = <R extends Request>(
  mw: (req: R, res: Response, next: NextFunction) => void | Promise<void>
) => (req: Request, res: Response, next: NextFunction): void | Promise<void> => {
    return (mw as (req: Request, res: Response, next: NextFunction) => void | Promise<void>)(req, res, next);
  };

// authenticate middleware’ini sar
const authenticateMw = adaptMw(authenticate);

// Controller handler’larını sar
const createStreamHandler = adapt(LiveController.createStream);
const getStreamByIdHandler = adapt(LiveController.getStreamById);
const updateStreamHandler = adapt(LiveController.updateStream);
const joinStreamHandler = adapt(LiveController.joinStream);
const leaveStreamHandler = adapt(LiveController.leaveStream);
const endStreamHandler = adapt(LiveController.endStream);
const searchStreamsHandler = adapt(LiveController.searchStreams);
const getTopStreamsHandler = adapt(LiveController.getTopStreams);
const getUserStreamsHandler = adapt(LiveController.getUserStreams);
const moderateStreamHandler = adapt(LiveController.moderateStream);
const reportStreamHandler = adapt(LiveController.reportStream);
const getStreamAnalyticsHandler = adapt(LiveController.getStreamAnalytics);

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateStreamRequest:
 *       type: object
 *       required:
 *         - title
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: Stream title
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Stream description
 *         category:
 *           type: string
 *           enum: [gaming, music, talk, education, sports, entertainment, lifestyle, technology, art, cooking, fitness, travel, news, other]
 *           description: Stream category
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *           description: Stream tags
 *         visibility:
 *           type: string
 *           enum: [public, private, followers-only]
 *           default: public
 *           description: Stream visibility
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: Scheduled start time (for scheduled streams)
 *         settings:
 *           type: object
 *           properties:
 *             allowComments:
 *               type: boolean
 *               default: true
 *             allowGifts:
 *               type: boolean
 *               default: true
 *             requireFollowToChat:
 *               type: boolean
 *               default: false
 *             slowModeDelay:
 *               type: integer
 *               minimum: 0
 *               maximum: 300
 *               default: 0
 *         monetization:
 *           type: object
 *           properties:
 *             isMonetized:
 *               type: boolean
 *               default: false
 *             subscriptionTier:
 *               type: string
 *               enum: [free, premium, vip]
 *               default: free
 *             ticketPrice:
 *               type: number
 *               minimum: 0
 *         metadata:
 *           type: object
 *           properties:
 *             language:
 *               type: string
 *               default: en
 *             ageRating:
 *               type: string
 *               enum: [all, 13+, 16+, 18+]
 *               default: all
 *             contentWarnings:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [violence, language, adult-content, flashing-lights, loud-sounds]
 *
 *     UpdateStreamRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 500
 *         category:
 *           type: string
 *           enum: [gaming, music, talk, education, sports, entertainment, lifestyle, technology, art, cooking, fitness, travel, news, other]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *         visibility:
 *           type: string
 *           enum: [public, private, followers-only]
 *         settings:
 *           type: object
 *           properties:
 *             allowComments:
 *               type: boolean
 *             allowGifts:
 *               type: boolean
 *             requireFollowToChat:
 *               type: boolean
 *             slowModeDelay:
 *               type: integer
 *               minimum: 0
 *               maximum: 300
 *
 *     JoinStreamRequest:
 *       type: object
 *       properties:
 *         quality:
 *           type: string
 *           enum: [240p, 360p, 480p, 720p, 1080p]
 *           default: 720p
 *         autoPlay:
 *           type: boolean
 *           default: true
 *         chatEnabled:
 *           type: boolean
 *           default: true
 *
 *     ModerateStreamRequest:
 *       type: object
 *       required:
 *         - action
 *       properties:
 *         action:
 *           type: string
 *           enum: [mute, unmute, ban_user, unban_user, add_moderator, remove_moderator, end_stream]
 *         userId:
 *           type: string
 *           description: Target user ID (required for user-specific actions)
 *         reason:
 *           type: string
 *           maxLength: 500
 *           description: Reason for moderation action
 *         duration:
 *           type: number
 *           minimum: 1
 *           maximum: 168
 *           description: Duration in hours (for temporary actions)
 *
 *     ReportStreamRequest:
 *       type: object
 *       required:
 *         - reason
 *       properties:
 *         reason:
 *           type: string
 *           enum: [inappropriate-content, harassment, spam, copyright, violence, hate-speech, nudity, other]
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Additional details about the report
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the incident (for recorded streams)
 *
 *     StreamSearchResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         streamer:
 *           $ref: '#/components/schemas/User'
 *         status:
 *           type: string
 *           enum: [live, ended, scheduled]
 *         visibility:
 *           type: string
 *           enum: [public, private, followers-only]
 *         stats:
 *           type: object
 *           properties:
 *             currentViewers:
 *               type: integer
 *             totalViewers:
 *               type: integer
 *             peakViewers:
 *               type: integer
 *             totalDuration:
 *               type: integer
 *         startedAt:
 *           type: string
 *           format: date-time
 *         endedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/live/create:
 *   post:
 *     summary: Create a new live stream
 *     tags: [Live Streams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStreamRequest'
 *     responses:
 *       201:
 *         description: Stream created successfully
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
 *                     stream:
 *                       $ref: '#/components/schemas/LiveStream'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: User already has an active stream
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', authenticateMw, validate(createStreamSchema), asyncHandler(createStreamHandler));

/**
 * @swagger
 * /api/live/{id}:
 *   get:
 *     summary: Get stream by ID
 *     tags: [Live Streams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Stream details
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
 *                     stream:
 *                       $ref: '#/components/schemas/LiveStream'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/:id', validateParams(streamIdParamSchema), asyncHandler(getStreamByIdHandler));

/**
 * @swagger
 * /api/live/{id}:
 *   put:
 *     summary: Update stream information
 *     tags: [Live Streams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStreamRequest'
 *     responses:
 *       200:
 *         description: Stream updated successfully
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
 *                     stream:
 *                       $ref: '#/components/schemas/LiveStream'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authenticateMw, validateParams(streamIdParamSchema), validate(updateStreamSchema), asyncHandler(updateStreamHandler));

/**
 * @swagger
 * /api/live/{id}/join:
 *   post:
 *     summary: Join a live stream
 *     tags: [Live Streams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinStreamRequest'
 *     responses:
 *       200:
 *         description: Joined stream successfully
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
 *                     stream:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         streamer:
 *                           $ref: '#/components/schemas/User'
 *                         currentViewers:
 *                           type: integer
 *                         settings:
 *                           type: object
 *                     playback:
 *                       type: object
 *                       properties:
 *                         hlsUrl:
 *                           type: string
 *                         quality:
 *                           type: string
 *                         availableQualities:
 *                           type: array
 *                           items:
 *                             type: string
 *                         autoPlay:
 *                           type: boolean
 *                         chatEnabled:
 *                           type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/join', validateParams(streamIdParamSchema), validate(joinStreamSchema), asyncHandler(joinStreamHandler));

/**
 * @swagger
 * /api/live/{id}/leave:
 *   post:
 *     summary: Leave a live stream
 *     tags: [Live Streams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Left stream successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/leave', validateParams(streamIdParamSchema), asyncHandler(leaveStreamHandler));

/**
 * @swagger
 * /api/live/{id}/end:
 *   post:
 *     summary: End a live stream
 *     tags: [Live Streams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Stream ended successfully
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
 *                     stream:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                         endedAt:
 *                           type: string
 *                           format: date-time
 *                         stats:
 *                           type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/end', authenticateMw, validateParams(streamIdParamSchema), asyncHandler(endStreamHandler));

/**
 * @swagger
 * /api/live/search:
 *   get:
 *     summary: Search and filter live streams
 *     tags: [Live Streams]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [gaming, music, talk, education, sports, entertainment, lifestyle, technology, art, cooking, fitness, travel, news, other]
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [live, ended, scheduled]
 *           default: live
 *         description: Filter by status
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [public, private, followers-only]
 *           default: public
 *         description: Filter by visibility
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language
 *       - in: query
 *         name: ageRating
 *         schema:
 *           type: string
 *           enum: [all, 13+, 16+, 18+]
 *         description: Filter by age rating
 *       - in: query
 *         name: minViewers
 *         schema:
 *           type: integer
 *         description: Minimum viewer count
 *       - in: query
 *         name: maxViewers
 *         schema:
 *           type: integer
 *         description: Maximum viewer count
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by tags
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [viewers, recent, duration, relevance]
 *           default: viewers
 *         description: Sort criteria
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Search results
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
 *                     streams:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StreamSearchResult'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/search', validateQuery(searchStreamsSchema), asyncHandler(searchStreamsHandler));

/**
 * @swagger
 * /api/live/top:
 *   get:
 *     summary: Get top streams
 *     tags: [Live Streams]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, all-time]
 *           default: daily
 *         description: Time period for ranking
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [gaming, music, talk, education, sports, entertainment, lifestyle, technology, art, cooking, fitness, travel, news, other]
 *         description: Filter by category
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [peak_viewers, total_viewers, duration, revenue, engagement]
 *           default: peak_viewers
 *         description: Ranking metric
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of results
 *     responses:
 *       200:
 *         description: Top streams
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
 *                     streams:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/StreamSearchResult'
 *                           - type: object
 *                             properties:
 *                               rank:
 *                                 type: integer
 *                               score:
 *                                 type: number
 *                     period:
 *                       type: string
 *                     category:
 *                       type: string
 *                     metric:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/top', validateQuery(getTopStreamsSchema), asyncHandler(getTopStreamsHandler));

/**
 * @swagger
 * /api/live/my-streams:
 *   get:
 *     summary: Get user's streams
 *     tags: [Live Streams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [live, ended, scheduled]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: User's streams
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
 *                     streams:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LiveStream'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/my-streams', authenticateMw, asyncHandler(getUserStreamsHandler));

/**
 * @swagger
 * /api/live/{id}/moderate:
 *   post:
 *     summary: Moderate a stream (admin/moderator only)
 *     tags: [Live Streams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerateStreamRequest'
 *     responses:
 *       200:
 *         description: Moderation action successful
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
 *                     stream:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         moderation:
 *                           type: object
 *                         status:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/moderate', authenticateMw, validateParams(streamIdParamSchema), validate(moderateStreamSchema), asyncHandler(moderateStreamHandler));

/**
 * @swagger
 * /api/live/{id}/report:
 *   post:
 *     summary: Report a stream
 *     tags: [Live Streams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportStreamRequest'
 *     responses:
 *       200:
 *         description: Stream reported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/report', authenticateMw, validateParams(streamIdParamSchema), validate(reportStreamSchema), asyncHandler(reportStreamHandler));

/**
 * @swagger
 * /api/live/{id}/analytics:
 *   get:
 *     summary: Get stream analytics (streamer only)
 *     tags: [Live Streams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly]
 *           default: daily
 *         description: Analytics period
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [viewers, engagement, revenue, technical]
 *           default: [viewers]
 *         description: Metrics to include
 *     responses:
 *       200:
 *         description: Stream analytics
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
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         overview:
 *                           type: object
 *                         engagement:
 *                           type: object
 *                         technical:
 *                           type: object
 *                     period:
 *                       type: string
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/analytics', authenticateMw, validateParams(streamIdParamSchema), validateQuery(streamAnalyticsSchema), asyncHandler(getStreamAnalyticsHandler));

export default router;