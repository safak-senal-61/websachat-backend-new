// module: moderation routes
import { Router } from 'express';
import { ModerationController } from '@/controllers/moderation';
import { authenticate as auth, authorize } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validation';
import {
  createReportSchema,
  getReportsSchema,
  assignReportSchema,
  addReportNoteSchema,
  resolveReportSchema,
  appealReportSchema,
  createBanSchema,
  getBansSchema,
  extendBanSchema,
  liftBanSchema,
  appealBanSchema,
  processAppealSchema,
  getModerationStatsSchema,
  reportIdParamSchema,
  banIdParamSchema
} from '../validators/moderation';
import type { Response, NextFunction, RequestHandler } from 'express';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

// Express adapter helpers to bridge AuthRequest-based handlers/middleware
const adapt = (handler: (req: AuthRequest, res: Response, next: NextFunction) => unknown): RequestHandler => {
  return (req, res, next) => handler(req as unknown as AuthRequest, res, next);
};
const adaptMw = (mw: (req: AuthRequest, res: Response, next: NextFunction) => unknown): RequestHandler => {
  return (req, res, next) => mw(req as unknown as AuthRequest, res, next);
};

// Express-compatible auth middlewares
const authenticateMw: RequestHandler = adaptMw(auth);
const authorizeMw = (...roles: string[]): RequestHandler => adaptMw(authorize(...roles));

// Wrap AuthRequest-based controllers
const createReportHandler = adapt(ModerationController.createReport);
const addReportNoteHandler = adapt(ModerationController.addReportNote);
const resolveReportHandler = adapt(ModerationController.resolveReport);
const dismissReportHandler = adapt(ModerationController.dismissReport);

/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         reporter:
 *           type: string
 *         reportedUser:
 *           type: string
 *         reportedContent:
 *           type: object
 *           properties:
 *             contentType:
 *               type: string
 *               enum: [stream, comment, user, gift, message]
 *             contentId:
 *               type: string
 *             contentUrl:
 *               type: string
 *             contentText:
 *               type: string
 *         category:
 *           type: string
 *           enum: [harassment, spam, inappropriate_content, copyright, violence, hate_speech, fraud, other]
 *         subcategory:
 *           type: string
 *         reason:
 *           type: string
 *         description:
 *           type: string
 *         evidence:
 *           type: array
 *           items:
 *             type: object
 *         status:
 *           type: string
 *           enum: [pending, under_review, resolved, dismissed, escalated]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         assignedTo:
 *           type: string
 *         moderatorNotes:
 *           type: array
 *           items:
 *             type: object
 *         resolution:
 *           type: object
 *         appeal:
 *           type: object
 *         isAnonymous:
 *           type: boolean
 *         isUrgent:
 *           type: boolean
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *     
 *     Ban:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         moderator:
 *           type: string
 *         type:
 *           type: string
 *           enum: [temporary, permanent, shadow, ip, device]
 *         scope:
 *           type: string
 *           enum: [platform, streaming, chat, gifts, comments, reactions, payments]
 *         reason:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         duration:
 *           type: number
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *         isLifted:
 *           type: boolean
 *         severity:
 *           type: string
 *           enum: [minor, moderate, major, severe, critical]
 *         restrictions:
 *           type: object
 *         appeal:
 *           type: object
 *         history:
 *           type: array
 *           items:
 *             type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Report Routes
/**
 * @swagger
 * /api/moderation/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - reason
 *             properties:
 *               reportedUserId:
 *                 type: string
 *               reportedContent:
 *                 type: object
 *                 properties:
 *                   contentType:
 *                     type: string
 *                     enum: [stream, comment, user, gift, message]
 *                   contentId:
 *                     type: string
 *                   contentUrl:
 *                     type: string
 *                   contentText:
 *                     type: string
 *               category:
 *                 type: string
 *                 enum: [harassment, spam, inappropriate_content, copyright, violence, hate_speech, fraud, other]
 *               subcategory:
 *                 type: string
 *               reason:
 *                 type: string
 *               description:
 *                 type: string
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: object
 *               isAnonymous:
 *                 type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Invalid input or duplicate report
 *       404:
 *         description: Reported user/content not found
 */
router.post('/reports', authenticateMw, validate(createReportSchema), createReportHandler);

/**
 * @swagger
 * /api/moderation/reports:
 *   get:
 *     summary: Get reports (admin/moderator only)
 *     tags: [Moderation]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, under_review, resolved, dismissed, escalated]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: reporterId
 *         schema:
 *           type: string
 *       - in: query
 *         name: reportedUserId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: isUrgent
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 */
router.get('/reports', authenticateMw, authorizeMw('admin', 'moderator'), validate(getReportsSchema), ModerationController.getReports);

/**
 * @swagger
 * /api/moderation/reports/{reportId}:
 *   get:
 *     summary: Get a specific report (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 *       404:
 *         description: Report not found
 */
router.get('/reports/:reportId', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(reportIdParamSchema), ModerationController.getReport);

/**
 * @swagger
 * /api/moderation/reports/{reportId}/assign:
 *   post:
 *     summary: Assign report to moderator (admin only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moderatorId
 *             properties:
 *               moderatorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report assigned successfully
 *       400:
 *         description: Invalid moderator
 *       404:
 *         description: Report not found
 */
router.post('/reports/:reportId/assign', authenticateMw, authorizeMw('admin'), validateParams(reportIdParamSchema), validate(assignReportSchema), ModerationController.assignReport);

/**
 * @swagger
 * /api/moderation/reports/{reportId}/notes:
 *   post:
 *     summary: Add note to report (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *               action:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note added successfully
 *       404:
 *         description: Report not found
 */
router.post('/reports/:reportId/notes', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(reportIdParamSchema), validate(addReportNoteSchema), addReportNoteHandler);

/**
 * @swagger
 * /api/moderation/reports/{reportId}/resolve:
 *   post:
 *     summary: Resolve report (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - reason
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [no_action, warning, temporary_ban, permanent_ban, content_removal, account_suspension]
 *               reason:
 *                 type: string
 *               appealable:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Report resolved successfully
 *       404:
 *         description: Report not found
 */
router.post('/reports/:reportId/resolve', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(reportIdParamSchema), validate(resolveReportSchema), resolveReportHandler);

/**
 * @swagger
 * /api/moderation/reports/{reportId}/dismiss:
 *   post:
 *     summary: Dismiss report (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report dismissed successfully
 *       404:
 *         description: Report not found
 */
router.post('/reports/:reportId/dismiss', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(reportIdParamSchema), dismissReportHandler);

/**
 * @swagger
 * /api/moderation/reports/{reportId}/appeal:
 *   post:
 *     summary: Appeal report resolution
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appealReason
 *             properties:
 *               appealReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appeal submitted successfully
 *       400:
 *         description: Appeal not allowed or already submitted
 *       404:
 *         description: Report not found
 */
router.post('/reports/:reportId/appeal', authenticateMw, validateParams(reportIdParamSchema), validate(appealReportSchema), ModerationController.appealReport);

// Ban Routes
/**
 * @swagger
 * /api/moderation/bans:
 *   post:
 *     summary: Create a new ban (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *               - scope
 *               - reason
 *               - category
 *             properties:
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [temporary, permanent, shadow, ip, device]
 *               scope:
 *                 type: string
 *                 enum: [platform, streaming, chat, gifts, comments, reactions, payments]
 *               reason:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: number
 *               severity:
 *                 type: string
 *                 enum: [minor, moderate, major, severe, critical]
 *               relatedReportId:
 *                 type: string
 *               relatedContent:
 *                 type: object
 *               restrictions:
 *                 type: object
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: object
 *               appealable:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Ban created successfully
 *       400:
 *         description: User already banned or invalid input
 *       404:
 *         description: User not found
 */
router.post('/bans', authenticateMw, authorizeMw('admin', 'moderator'), validate(createBanSchema), ModerationController.createBan);

/**
 * @swagger
 * /api/moderation/bans:
 *   get:
 *     summary: Get bans (admin/moderator only)
 *     tags: [Moderation]
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
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [temporary, permanent, shadow, ip, device]
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [platform, streaming, chat, gifts, comments, reactions, payments]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [minor, moderate, major, severe, critical]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isLifted
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: moderatorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Bans retrieved successfully
 */
router.get('/bans', authenticateMw, authorizeMw('admin', 'moderator'), validate(getBansSchema), ModerationController.getBans);

/**
 * @swagger
 * /api/moderation/bans/{banId}:
 *   get:
 *     summary: Get a specific ban (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: banId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ban retrieved successfully
 *       404:
 *         description: Ban not found
 */
router.get('/bans/:banId', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(banIdParamSchema), ModerationController.getBan);

/**
 * @swagger
 * /api/moderation/bans/{banId}/extend:
 *   post:
 *     summary: Extend ban duration (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: banId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - additionalDuration
 *             properties:
 *               additionalDuration:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ban extended successfully
 *       400:
 *         description: Cannot extend permanent ban
 *       404:
 *         description: Ban not found
 */
router.post('/bans/:banId/extend', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(banIdParamSchema), validate(extendBanSchema), ModerationController.extendBan);

/**
 * @swagger
 * /api/moderation/bans/{banId}/lift:
 *   post:
 *     summary: Lift ban (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: banId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ban lifted successfully
 *       404:
 *         description: Ban not found
 */
router.post('/bans/:banId/lift', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(banIdParamSchema), validate(liftBanSchema), ModerationController.liftBan);

/**
 * @swagger
 * /api/moderation/bans/{banId}/appeal:
 *   post:
 *     summary: Appeal ban
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: banId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appealReason
 *             properties:
 *               appealReason:
 *                 type: string
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Appeal submitted successfully
 *       400:
 *         description: Appeal not allowed or already submitted
 *       404:
 *         description: Ban not found
 */
router.post('/bans/:banId/appeal', authenticateMw, validateParams(banIdParamSchema), validate(appealBanSchema), ModerationController.appealBan);

/**
 * @swagger
 * /api/moderation/bans/{banId}/appeal/process:
 *   post:
 *     summary: Process ban appeal (admin only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: banId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *               - resolution
 *             properties:
 *               approved:
 *                 type: boolean
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appeal processed successfully
 *       404:
 *         description: Ban not found
 */
router.post('/bans/:banId/appeal/process', authenticateMw, authorizeMw('admin'), validateParams(banIdParamSchema), validate(processAppealSchema), ModerationController.processAppeal);

// Statistics Routes
/**
 * @swagger
 * /api/moderation/stats/reports:
 *   get:
 *     summary: Get report statistics (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, all]
 *           default: monthly
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report statistics retrieved successfully
 */
router.get('/stats/reports', authenticateMw, authorizeMw('admin', 'moderator'), validate(getModerationStatsSchema), ModerationController.getReportStats);

/**
 * @swagger
 * /api/moderation/stats/bans:
 *   get:
 *     summary: Get ban statistics (admin/moderator only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, all]
 *           default: monthly
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ban statistics retrieved successfully
 */
router.get('/stats/bans', authenticateMw, authorizeMw('admin', 'moderator'), validate(getModerationStatsSchema), ModerationController.getBanStats);

/**
 * @swagger
 * /api/moderation/stats/workload:
 *   get:
 *     summary: Get moderator workload statistics (admin only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Moderator workload retrieved successfully
 */
router.get('/stats/workload', authenticateMw, authorizeMw('admin'), ModerationController.getModeratorWorkload);

// Utility Routes
/**
 * @swagger
 * /api/moderation/cleanup/expired-bans:
 *   post:
 *     summary: Cleanup expired bans (admin only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired bans cleaned up successfully
 */
router.post('/cleanup/expired-bans', authenticateMw, authorizeMw('admin'), ModerationController.cleanupExpiredBans);

export default router;