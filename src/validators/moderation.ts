import Joi from 'joi';

// Report validation schemas
export const createReportSchema = Joi.object({
  reportedUserId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  reportedContent: Joi.object({
    contentType: Joi.string().valid('stream', 'comment', 'user', 'gift', 'message').required(),
    contentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    contentUrl: Joi.string().uri().optional(),
    contentText: Joi.string().max(1000).optional(),
    contentMetadata: Joi.object().optional()
  }).optional(),
  category: Joi.string().valid(
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'copyright', 'fake_account', 'scam', 'underage', 'other'
  ).required(),
  subcategory: Joi.string().max(100).optional(),
  reason: Joi.string().min(10).max(500).required(),
  description: Joi.string().max(2000).optional(),
  evidence: Joi.object({
    screenshots: Joi.array().items(Joi.string().uri()).max(10).optional(),
    videos: Joi.array().items(Joi.string().uri()).max(5).optional(),
    links: Joi.array().items(Joi.string().uri()).max(10).optional(),
    additionalInfo: Joi.string().max(1000).optional()
  }).optional(),
  isAnonymous: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
}).xor('reportedUserId', 'reportedContent');

export const getReportsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'under_review', 'resolved', 'dismissed', 'escalated').optional(),
  category: Joi.string().valid(
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'copyright', 'fake_account', 'scam', 'underage', 'other'
  ).optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  reporterId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  reportedUserId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  isUrgent: Joi.boolean().optional(),
  sortBy: Joi.string().valid('createdAt', 'priority', 'status', 'category').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const updateReportSchema = Joi.object({
  status: Joi.string().valid('pending', 'under_review', 'resolved', 'dismissed', 'escalated').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
});

export const assignReportSchema = Joi.object({
  moderatorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});

export const addReportNoteSchema = Joi.object({
  note: Joi.string().min(1).max(1000).required(),
  action: Joi.string().max(100).optional()
});

export const resolveReportSchema = Joi.object({
  action: Joi.string().valid(
    'no_action', 'warning', 'content_removal', 'temporary_ban', 
    'permanent_ban', 'account_suspension', 'other'
  ).required(),
  reason: Joi.string().min(10).max(500).required(),
  appealable: Joi.boolean().default(true)
});

export const appealReportSchema = Joi.object({
  appealReason: Joi.string().min(10).max(1000).required()
});

// Ban validation schemas
export const createBanSchema = Joi.object({
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  type: Joi.string().valid('temporary', 'permanent', 'shadow', 'ip', 'device').required(),
  scope: Joi.string().valid(
    'platform', 'streaming', 'chat', 'gifts', 'comments', 'reactions', 'payments'
  ).required(),
  reason: Joi.string().min(10).max(500).required(),
  category: Joi.string().valid(
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'copyright', 'fake_account', 'scam', 'underage', 'terms_violation', 'other'
  ).required(),
  description: Joi.string().max(2000).optional(),
  duration: Joi.when('type', {
    is: 'temporary',
    then: Joi.number().integer().min(60000).max(31536000000).required(), // 1 minute to 1 year in ms
    otherwise: Joi.forbidden()
  }),
  severity: Joi.string().valid('minor', 'moderate', 'major', 'severe', 'critical').required(),
  relatedReportId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  relatedContent: Joi.object({
    contentType: Joi.string().valid('stream', 'comment', 'user', 'gift', 'message').required(),
    contentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    contentUrl: Joi.string().uri().optional()
  }).optional(),
  restrictions: Joi.object({
    canStream: Joi.boolean().default(true),
    canComment: Joi.boolean().default(true),
    canSendGifts: Joi.boolean().default(true),
    canReceiveGifts: Joi.boolean().default(true),
    canReact: Joi.boolean().default(true),
    canFollow: Joi.boolean().default(true),
    canMessage: Joi.boolean().default(true),
    canCreateAccount: Joi.boolean().default(true),
    canMakePayments: Joi.boolean().default(true),
    maxStreamDuration: Joi.number().integer().min(0).optional(),
    maxGiftValue: Joi.number().min(0).optional(),
    commentCooldown: Joi.number().integer().min(0).optional()
  }).optional(),
  evidence: Joi.object({
    screenshots: Joi.array().items(Joi.string().uri()).max(10).optional(),
    videos: Joi.array().items(Joi.string().uri()).max(5).optional(),
    logs: Joi.array().items(Joi.string()).max(20).optional(),
    additionalInfo: Joi.string().max(1000).optional()
  }).optional(),
  appealable: Joi.boolean().default(true)
});

export const getBansSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  type: Joi.string().valid('temporary', 'permanent', 'shadow', 'ip', 'device').optional(),
  scope: Joi.string().valid(
    'platform', 'streaming', 'chat', 'gifts', 'comments', 'reactions', 'payments'
  ).optional(),
  category: Joi.string().valid(
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 
    'copyright', 'fake_account', 'scam', 'underage', 'terms_violation', 'other'
  ).optional(),
  severity: Joi.string().valid('minor', 'moderate', 'major', 'severe', 'critical').optional(),
  isActive: Joi.boolean().optional(),
  isLifted: Joi.boolean().optional(),
  moderatorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  sortBy: Joi.string().valid('createdAt', 'severity', 'endDate', 'type').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const updateBanSchema = Joi.object({
  reason: Joi.string().min(10).max(500).optional(),
  description: Joi.string().max(2000).optional(),
  severity: Joi.string().valid('minor', 'moderate', 'major', 'severe', 'critical').optional(),
  restrictions: Joi.object({
    canStream: Joi.boolean().optional(),
    canComment: Joi.boolean().optional(),
    canSendGifts: Joi.boolean().optional(),
    canReceiveGifts: Joi.boolean().optional(),
    canReact: Joi.boolean().optional(),
    canFollow: Joi.boolean().optional(),
    canMessage: Joi.boolean().optional(),
    canCreateAccount: Joi.boolean().optional(),
    canMakePayments: Joi.boolean().optional(),
    maxStreamDuration: Joi.number().integer().min(0).optional(),
    maxGiftValue: Joi.number().min(0).optional(),
    commentCooldown: Joi.number().integer().min(0).optional()
  }).optional()
});

export const extendBanSchema = Joi.object({
  additionalDuration: Joi.number().integer().min(60000).max(31536000000).required(), // 1 minute to 1 year
  reason: Joi.string().min(10).max(500).required()
});

export const liftBanSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required()
});

export const appealBanSchema = Joi.object({
  appealReason: Joi.string().min(10).max(2000).required(),
  evidence: Joi.object({
    documents: Joi.array().items(Joi.string().uri()).max(10).optional(),
    explanation: Joi.string().max(1000).optional()
  }).optional()
});

export const processAppealSchema = Joi.object({
  approved: Joi.boolean().required(),
  resolution: Joi.string().min(10).max(1000).required()
});

// Content moderation schemas
export const moderateContentSchema = Joi.object({
  contentType: Joi.string().valid('stream', 'comment', 'user', 'gift', 'message').required(),
  contentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  action: Joi.string().valid(
    'approve', 'reject', 'hide', 'delete', 'flag', 'pin', 'unpin', 'feature', 'unfeature'
  ).required(),
  reason: Joi.string().min(5).max(500).optional(),
  moderatorNote: Joi.string().max(1000).optional()
});

export const bulkModerateSchema = Joi.object({
  contentIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
  contentType: Joi.string().valid('stream', 'comment', 'user', 'gift', 'message').required(),
  action: Joi.string().valid(
    'approve', 'reject', 'hide', 'delete', 'flag', 'pin', 'unpin'
  ).required(),
  reason: Joi.string().min(5).max(500).optional()
});

export const getContentModerationQueueSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  contentType: Joi.string().valid('stream', 'comment', 'user', 'gift', 'message').optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'flagged').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  autoFlagged: Joi.boolean().optional(),
  sortBy: Joi.string().valid('createdAt', 'priority', 'reportCount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Statistics schemas
export const getModerationStatsSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  moderatorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  category: Joi.string().optional(),
  type: Joi.string().valid('reports', 'bans', 'content').optional()
});

// Parameter validation schemas
export const reportIdParamSchema = Joi.object({
  reportId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});

export const banIdParamSchema = Joi.object({
  banId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});

export const userIdParamSchema = Joi.object({
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});

export const contentIdParamSchema = Joi.object({
  contentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});