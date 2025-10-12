import { Router } from 'express';
import type { RequestHandler, NextFunction } from 'express';
import { SystemSettingsController } from '@/controllers/systemSettings';
import { authenticate as auth, authorize } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

import { validate, validateParams, validateQuery } from '../middleware/validation';
import {
  getSettingsSchema,
  getSettingSchema,
  createSettingSchema,
  updateSettingSchema,
  bulkUpdateSettingsSchema,
  resetSettingsSchema,
  exportSettingsSchema,
  importSettingsSchema,
  rollbackSettingSchema,
  validateSettingValueSchema,
  getSettingHistorySchema,
  updateNotificationSettingsSchema,
  updatePrivacySettingsSchema,
  updateSupportSettingsSchema,
  settingKeyParamSchema
} from '../validators/systemSettings';

// AuthRequest tabanlı controller/middleware’ları Express RequestHandler’a adapte eder
const adapt = (
  handler: (req: AuthRequest, res: Parameters<typeof SystemSettingsController.getSettings>[1]) => Promise<void>
): RequestHandler => {
  return (req, res, next) => {
    handler(req as AuthRequest, res).catch(next);
  };
};

const adaptMw = (
  mw: (req: AuthRequest, res: Parameters<typeof SystemSettingsController.getSettings>[1], next: NextFunction) => unknown
): RequestHandler => {
  return (req, res, next) => mw(req as AuthRequest, res, next);
};

const authenticateMw = adaptMw(auth);
const authorizeMw = (...roles: string[]): RequestHandler => adaptMw(authorize(...roles));

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemSetting:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Setting ID
 *         category:
 *           type: string
 *           enum: [general, security, notifications, streaming, payments, moderation, analytics, api]
 *           description: Setting category
 *         key:
 *           type: string
 *           description: Unique setting key
 *         value:
 *           description: Setting value (any type)
 *         type:
 *           type: string
 *           enum: [string, number, boolean, object, array]
 *           description: Value type
 *         description:
 *           type: string
 *           description: Setting description
 *         isPublic:
 *           type: boolean
 *           description: Whether setting is publicly accessible
 *         isEditable:
 *           type: boolean
 *           description: Whether setting can be edited
 *         validation:
 *           type: object
 *           description: Validation rules
 *         metadata:
 *           type: object
 *           description: Additional metadata
 *         lastModified:
 *           type: string
 *           format: date-time
 *           description: Last modification date
 *         modifiedBy:
 *           type: string
 *           description: User who last modified
 *         version:
 *           type: number
 *           description: Setting version
 *         history:
 *           type: array
 *           description: Change history
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     NotificationSettings:
 *       type: object
 *       properties:
 *         emailNotifications:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             newUser:
 *               type: boolean
 *             newStream:
 *               type: boolean
 *             systemAlerts:
 *               type: boolean
 *             moderationAlerts:
 *               type: boolean
 *             revenueReports:
 *               type: boolean
 *         pushNotifications:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             newFollower:
 *               type: boolean
 *             newGift:
 *               type: boolean
 *             streamStart:
 *               type: boolean
 *             systemMaintenance:
 *               type: boolean
 *         smsNotifications:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             securityAlerts:
 *               type: boolean
 *             criticalAlerts:
 *               type: boolean
 *         inAppNotifications:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             sound:
 *               type: boolean
 *             desktop:
 *               type: boolean
 *             mobile:
 *               type: boolean
 * 
 *     PrivacySettings:
 *       type: object
 *       properties:
 *         dataRetention:
 *           type: object
 *           properties:
 *             userDataDays:
 *               type: number
 *             logDataDays:
 *               type: number
 *             analyticsDataDays:
 *               type: number
 *             deletedUserDataDays:
 *               type: number
 *         cookieSettings:
 *           type: object
 *           properties:
 *             essential:
 *               type: boolean
 *             analytics:
 *               type: boolean
 *             marketing:
 *               type: boolean
 *             preferences:
 *               type: boolean
 *         dataSharing:
 *           type: object
 *           properties:
 *             analytics:
 *               type: boolean
 *             marketing:
 *               type: boolean
 *             thirdParty:
 *               type: boolean
 *             research:
 *               type: boolean
 *         userRights:
 *           type: object
 *           properties:
 *             dataExport:
 *               type: boolean
 *             dataCorrection:
 *               type: boolean
 *             dataDeletion:
 *               type: boolean
 *             dataPortability:
 *               type: boolean
 * 
 *     SupportSettings:
 *       type: object
 *       properties:
 *         ticketSystem:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             autoAssignment:
 *               type: boolean
 *             priorityLevels:
 *               type: array
 *               items:
 *                 type: string
 *             defaultPriority:
 *               type: string
 *             autoCloseInactiveDays:
 *               type: number
 *             maxTicketsPerUser:
 *               type: number
 *         chatSupport:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             businessHours:
 *               type: object
 *             maxConcurrentChats:
 *               type: number
 *             autoGreeting:
 *               type: string
 *         knowledgeBase:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             publicAccess:
 *               type: boolean
 *             searchEnabled:
 *               type: boolean
 *             categoriesEnabled:
 *               type: boolean
 *             ratingsEnabled:
 *               type: boolean
 *         contactMethods:
 *           type: object
 *           properties:
 *             email:
 *               type: object
 *             phone:
 *               type: object
 *             social:
 *               type: object
 */

/**
 * @swagger
 * /api/system-settings:
 *   get:
 *     summary: Get system settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, security, notifications, streaming, payments, moderation, analytics, api]
 *         description: Filter by category
 *       - in: query
 *         name: publicOnly
 *         schema:
 *           type: boolean
 *         description: Get only public settings
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in key and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [key, category, lastModified]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
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
 *                     settings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SystemSetting'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', authenticateMw, validateQuery(getSettingsSchema), adapt(SystemSettingsController.getSettings));

/**
 * @swagger
 * /api/system-settings/public:
 *   get:
 *     summary: Get public system settings
 *     tags: [System Settings]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, security, notifications, streaming, payments, moderation, analytics, api]
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Public settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SystemSetting'
 */
router.get('/public', SystemSettingsController.getPublicSettings);

/**
 * @swagger
 * /api/system-settings/category/{category}:
 *   get:
 *     summary: Get settings by category
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [general, security, notifications, streaming, payments, moderation, analytics, api]
 *         description: Setting category
 *       - in: query
 *         name: publicOnly
 *         schema:
 *           type: boolean
 *         description: Get only public settings
 *     responses:
 *       200:
 *         description: Category settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SystemSetting'
 */
router.get('/category/:category', authenticateMw, adapt(SystemSettingsController.getSettingsByCategory));

/**
 * @swagger
 * /api/system-settings/export:
 *   get:
 *     summary: Export system settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, security, notifications, streaming, payments, moderation, analytics, api]
 *         description: Filter by category
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, yaml, env]
 *         description: Export format
 *       - in: query
 *         name: includeMetadata
 *         schema:
 *           type: boolean
 *         description: Include metadata
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *         description: Include history
 *       - in: query
 *         name: publicOnly
 *         schema:
 *           type: boolean
 *         description: Export only public settings
 *     responses:
 *       200:
 *         description: Settings exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           application/x-yaml:
 *             schema:
 *               type: string
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/export', authenticateMw, authorizeMw('admin'), validateQuery(exportSettingsSchema), adapt(SystemSettingsController.exportSettings));

/**
 * @swagger
 * /api/system-settings/import:
 *   post:
 *     summary: Import system settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 description: Settings to import
 *               overwrite:
 *                 type: boolean
 *                 description: Overwrite existing settings
 *               reason:
 *                 type: string
 *                 description: Import reason
 *             required:
 *               - settings
 *     responses:
 *       200:
 *         description: Settings imported successfully
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
 */
router.post('/import', authenticateMw, authorizeMw('admin'), validate(importSettingsSchema), adapt(SystemSettingsController.importSettings));

/**
 * @swagger
 * /api/system-settings/reset:
 *   post:
 *     summary: Reset settings to defaults
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [general, security, notifications, streaming, payments, moderation, analytics, api]
 *                 description: Category to reset
 *               keys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific keys to reset
 *               confirm:
 *                 type: boolean
 *                 description: Confirmation flag
 *             required:
 *               - confirm
 *     responses:
 *       200:
 *         description: Settings reset successfully
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
 */
router.post('/reset', authenticateMw, authorizeMw('admin'), validate(resetSettingsSchema), adapt(SystemSettingsController.resetSettings));

/**
 * @swagger
 * /api/system-settings/bulk-update:
 *   put:
 *     summary: Bulk update settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       description: New value
 *                     reason:
 *                       type: string
 *                   required:
 *                     - key
 *                     - value
 *               reason:
 *                 type: string
 *                 description: Global reason for all updates
 *             required:
 *               - settings
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.put('/bulk-update', authenticateMw, authorizeMw('admin', 'moderator'), validate(bulkUpdateSettingsSchema), adapt(SystemSettingsController.bulkUpdateSettings));

/**
 * @swagger
 * /api/system-settings/{key}:
 *   get:
 *     summary: Get specific setting
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *         description: Include change history
 *       - in: query
 *         name: includeMetadata
 *         schema:
 *           type: boolean
 *         description: Include metadata
 *     responses:
 *       200:
 *         description: Setting retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SystemSetting'
 *       404:
 *         description: Setting not found
 */
router.get('/:key', authenticateMw, validateParams(settingKeyParamSchema), validateQuery(getSettingSchema), adapt(SystemSettingsController.getSetting));

/**
 * @swagger
 * /api/system-settings/{key}:
 *   put:
 *     summary: Update setting
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 description: New setting value
 *               reason:
 *                 type: string
 *                 description: Update reason
 *             required:
 *               - value
 *     responses:
 *       200:
 *         description: Setting updated successfully
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
 *                   $ref: '#/components/schemas/SystemSetting'
 *       404:
 *         description: Setting not found
 */
router.put('/:key', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(settingKeyParamSchema), validate(updateSettingSchema), adapt(SystemSettingsController.updateSetting));

/**
 * @swagger
 * /api/system-settings/{key}:
 *   delete:
 *     summary: Delete setting
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *     responses:
 *       200:
 *         description: Setting deleted successfully
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
 *         description: Setting not found
 */
router.delete('/:key', authenticateMw, authorizeMw('admin'), validateParams(settingKeyParamSchema), adapt(SystemSettingsController.deleteSetting));

/**
 * @swagger
 * /api/system-settings/{key}/validate:
 *   post:
 *     summary: Validate setting value
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 description: Value to validate
 *             required:
 *               - value
 *     responses:
 *       200:
 *         description: Validation result
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
 *                     valid:
 *                       type: boolean
 *                     value:
 *                       description: Validated value
 */
router.post('/:key/validate', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(settingKeyParamSchema), validate(validateSettingValueSchema), adapt(SystemSettingsController.validateSettingValue));

/**
 * @swagger
 * /api/system-settings/{key}/rollback:
 *   post:
 *     summary: Rollback setting to previous version
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               version:
 *                 type: number
 *                 description: Version to rollback to
 *               reason:
 *                 type: string
 *                 description: Rollback reason
 *             required:
 *               - version
 *     responses:
 *       200:
 *         description: Setting rolled back successfully
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
 *                   $ref: '#/components/schemas/SystemSetting'
 */
router.post('/:key/rollback', authenticateMw, authorizeMw('admin'), validateParams(settingKeyParamSchema), validate(rollbackSettingSchema), adapt(SystemSettingsController.rollbackSetting));

/**
 * @swagger
 * /api/system-settings/{key}/history:
 *   get:
 *     summary: Get setting change history
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *       - in: query
 *         name: modifiedBy
 *         schema:
 *           type: string
 *         description: Filter by modifier user ID
 *     responses:
 *       200:
 *         description: Setting history retrieved successfully
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
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/:key/history', authenticateMw, authorizeMw('admin', 'moderator'), validateParams(settingKeyParamSchema), validateQuery(getSettingHistorySchema), adapt(SystemSettingsController.getSettingHistory));

/**
 * @swagger
 * /api/system-settings:
 *   post:
 *     summary: Create new setting
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [general, security, notifications, streaming, payments, moderation, analytics, api]
 *               key:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9._-]+$'
 *               value:
 *                 description: Setting value
 *               type:
 *                 type: string
 *                 enum: [string, number, boolean, object, array]
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               isEditable:
 *                 type: boolean
 *               validation:
 *                 type: object
 *               metadata:
 *                 type: object
 *             required:
 *               - category
 *               - key
 *               - value
 *               - type
 *     responses:
 *       201:
 *         description: Setting created successfully
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
 *                   $ref: '#/components/schemas/SystemSetting'
 */
router.post('/', authenticateMw, authorizeMw('admin'), validate(createSettingSchema), adapt(SystemSettingsController.createSetting));

// Notification Settings Routes
/**
 * @swagger
 * /api/system-settings/notifications/update:
 *   put:
 *     summary: Update notification settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 $ref: '#/components/schemas/NotificationSettings'
 *               reason:
 *                 type: string
 *             required:
 *               - settings
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
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
 */
router.put('/notifications/update', authenticateMw, authorizeMw('admin', 'moderator'), validate(updateNotificationSettingsSchema), adapt(SystemSettingsController.updateNotificationSettings));

// Privacy Settings Routes
/**
 * @swagger
 * /api/system-settings/privacy/update:
 *   put:
 *     summary: Update privacy settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 $ref: '#/components/schemas/PrivacySettings'
 *               reason:
 *                 type: string
 *             required:
 *               - settings
 *     responses:
 *       200:
 *         description: Privacy settings updated successfully
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
 */
router.put('/privacy/update', authenticateMw, authorizeMw('admin'), validate(updatePrivacySettingsSchema), adapt(SystemSettingsController.updatePrivacySettings));

// Support Settings Routes
/**
 * @swagger
 * /api/system-settings/support/update:
 *   put:
 *     summary: Update support settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 $ref: '#/components/schemas/SupportSettings'
 *               reason:
 *                 type: string
 *             required:
 *               - settings
 *     responses:
 *       200:
 *         description: Support settings updated successfully
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
 */
router.put('/support/update', authenticateMw, authorizeMw('admin', 'moderator'), validate(updateSupportSettingsSchema), adapt(SystemSettingsController.updateSupportSettings));

export default router;