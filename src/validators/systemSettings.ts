import Joi from 'joi';

// System Settings Validation Schemas

export const getSettingsSchema = Joi.object({
  category: Joi.string().valid('general', 'security', 'notifications', 'streaming', 'payments', 'moderation', 'analytics', 'api').optional(),
  publicOnly: Joi.boolean().default(false),
  search: Joi.string().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('key', 'category', 'lastModified').default('key'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

export const getSettingSchema = Joi.object({
  includeHistory: Joi.boolean().default(false),
  includeMetadata: Joi.boolean().default(true)
});

export const updateSettingSchema = Joi.object({
  value: Joi.any().required(),
  reason: Joi.string().min(1).max(500).optional()
});

export const createSettingSchema = Joi.object({
  category: Joi.string().valid('general', 'security', 'notifications', 'streaming', 'payments', 'moderation', 'analytics', 'api').required(),
  key: Joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9._-]+$/).required(),
  value: Joi.any().required(),
  type: Joi.string().valid('string', 'number', 'boolean', 'object', 'array').required(),
  description: Joi.string().min(1).max(500).optional(),
  isPublic: Joi.boolean().default(false),
  isEditable: Joi.boolean().default(true),
  validation: Joi.object({
    required: Joi.boolean().default(false),
    min: Joi.number().optional(),
    max: Joi.number().optional(),
    pattern: Joi.string().optional(),
    enum: Joi.array().items(Joi.string()).optional(),
    custom: Joi.string().optional()
  }).optional(),
  metadata: Joi.object({
    unit: Joi.string().optional(),
    format: Joi.string().optional(),
    dependencies: Joi.array().items(Joi.string()).optional(),
    restartRequired: Joi.boolean().default(false),
    environment: Joi.string().valid('development', 'staging', 'production', 'all').default('all')
  }).optional()
});

export const bulkUpdateSettingsSchema = Joi.object({
  settings: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      value: Joi.any().required(),
      reason: Joi.string().min(1).max(500).optional()
    })
  ).min(1).max(50).required(),
  reason: Joi.string().min(1).max(500).optional()
});

export const resetSettingsSchema = Joi.object({
  category: Joi.string().valid('general', 'security', 'notifications', 'streaming', 'payments', 'moderation', 'analytics', 'api').optional(),
  keys: Joi.array().items(Joi.string()).optional(),
  confirm: Joi.boolean().valid(true).required()
});

export const exportSettingsSchema = Joi.object({
  category: Joi.string().valid('general', 'security', 'notifications', 'streaming', 'payments', 'moderation', 'analytics', 'api').optional(),
  format: Joi.string().valid('json', 'yaml', 'env').default('json'),
  includeMetadata: Joi.boolean().default(true),
  includeHistory: Joi.boolean().default(false),
  publicOnly: Joi.boolean().default(false)
});

export const importSettingsSchema = Joi.object({
  settings: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      value: Joi.any().required(),
      type: Joi.string().valid('string', 'number', 'boolean', 'object', 'array').required(),
      category: Joi.string().valid('general', 'security', 'notifications', 'streaming', 'payments', 'moderation', 'analytics', 'api').required(),
      description: Joi.string().optional(),
      isPublic: Joi.boolean().default(false),
      isEditable: Joi.boolean().default(true),
      validation: Joi.object().optional(),
      metadata: Joi.object().optional()
    })
  ).required(),
  overwrite: Joi.boolean().default(false),
  reason: Joi.string().min(1).max(500).optional()
});

export const rollbackSettingSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  reason: Joi.string().min(1).max(500).optional()
});

export const validateSettingValueSchema = Joi.object({
  value: Joi.any().required()
});

export const getSettingHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  modifiedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
});

// Notification Settings Schemas
export const notificationSettingsSchema = Joi.object({
  emailNotifications: Joi.object({
    enabled: Joi.boolean().default(true),
    newUser: Joi.boolean().default(true),
    newStream: Joi.boolean().default(false),
    systemAlerts: Joi.boolean().default(true),
    moderationAlerts: Joi.boolean().default(true),
    revenueReports: Joi.boolean().default(true)
  }).optional(),
  pushNotifications: Joi.object({
    enabled: Joi.boolean().default(true),
    newFollower: Joi.boolean().default(true),
    newGift: Joi.boolean().default(true),
    streamStart: Joi.boolean().default(true),
    systemMaintenance: Joi.boolean().default(true)
  }).optional(),
  smsNotifications: Joi.object({
    enabled: Joi.boolean().default(false),
    securityAlerts: Joi.boolean().default(true),
    criticalAlerts: Joi.boolean().default(true)
  }).optional(),
  inAppNotifications: Joi.object({
    enabled: Joi.boolean().default(true),
    sound: Joi.boolean().default(true),
    desktop: Joi.boolean().default(true),
    mobile: Joi.boolean().default(true)
  }).optional()
});

export const updateNotificationSettingsSchema = Joi.object({
  settings: notificationSettingsSchema.required(),
  reason: Joi.string().min(1).max(500).optional()
});

// Privacy Settings Schemas
export const privacySettingsSchema = Joi.object({
  dataRetention: Joi.object({
    userDataDays: Joi.number().integer().min(30).max(2555).default(365), // 7 years max
    logDataDays: Joi.number().integer().min(7).max(365).default(90),
    analyticsDataDays: Joi.number().integer().min(30).max(1095).default(730), // 3 years max
    deletedUserDataDays: Joi.number().integer().min(7).max(90).default(30)
  }).optional(),
  cookieSettings: Joi.object({
    essential: Joi.boolean().default(true),
    analytics: Joi.boolean().default(true),
    marketing: Joi.boolean().default(false),
    preferences: Joi.boolean().default(true)
  }).optional(),
  dataSharing: Joi.object({
    analytics: Joi.boolean().default(false),
    marketing: Joi.boolean().default(false),
    thirdParty: Joi.boolean().default(false),
    research: Joi.boolean().default(false)
  }).optional(),
  userRights: Joi.object({
    dataExport: Joi.boolean().default(true),
    dataCorrection: Joi.boolean().default(true),
    dataDeletion: Joi.boolean().default(true),
    dataPortability: Joi.boolean().default(true)
  }).optional()
});

export const updatePrivacySettingsSchema = Joi.object({
  settings: privacySettingsSchema.required(),
  reason: Joi.string().min(1).max(500).optional()
});

// Support Settings Schemas
export const supportSettingsSchema = Joi.object({
  ticketSystem: Joi.object({
    enabled: Joi.boolean().default(true),
    autoAssignment: Joi.boolean().default(true),
    priorityLevels: Joi.array().items(Joi.string()).default(['low', 'medium', 'high', 'urgent']),
    defaultPriority: Joi.string().default('medium'),
    autoCloseInactiveDays: Joi.number().integer().min(1).max(365).default(30),
    maxTicketsPerUser: Joi.number().integer().min(1).max(100).default(10)
  }).optional(),
  chatSupport: Joi.object({
    enabled: Joi.boolean().default(true),
    businessHours: Joi.object({
      enabled: Joi.boolean().default(true),
      timezone: Joi.string().default('UTC'),
      monday: Joi.object({ start: Joi.string(), end: Joi.string() }).default({ start: '09:00', end: '17:00' }),
      tuesday: Joi.object({ start: Joi.string(), end: Joi.string() }).default({ start: '09:00', end: '17:00' }),
      wednesday: Joi.object({ start: Joi.string(), end: Joi.string() }).default({ start: '09:00', end: '17:00' }),
      thursday: Joi.object({ start: Joi.string(), end: Joi.string() }).default({ start: '09:00', end: '17:00' }),
      friday: Joi.object({ start: Joi.string(), end: Joi.string() }).default({ start: '09:00', end: '17:00' }),
      saturday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
      sunday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional()
    }).optional(),
    maxConcurrentChats: Joi.number().integer().min(1).max(100).default(5),
    autoGreeting: Joi.string().max(500).default('Hello! How can we help you today?')
  }).optional(),
  knowledgeBase: Joi.object({
    enabled: Joi.boolean().default(true),
    publicAccess: Joi.boolean().default(true),
    searchEnabled: Joi.boolean().default(true),
    categoriesEnabled: Joi.boolean().default(true),
    ratingsEnabled: Joi.boolean().default(true)
  }).optional(),
  contactMethods: Joi.object({
    email: Joi.object({
      enabled: Joi.boolean().default(true),
      address: Joi.string().email().required(),
      autoReply: Joi.boolean().default(true)
    }).optional(),
    phone: Joi.object({
      enabled: Joi.boolean().default(false),
      number: Joi.string().optional(),
      businessHours: Joi.boolean().default(true)
    }).optional(),
    social: Joi.object({
      twitter: Joi.string().optional(),
      facebook: Joi.string().optional(),
      discord: Joi.string().optional()
    }).optional()
  }).optional()
});

export const updateSupportSettingsSchema = Joi.object({
  settings: supportSettingsSchema.required(),
  reason: Joi.string().min(1).max(500).optional()
});

// Parameter validation schemas
export const settingKeyParamSchema = Joi.object({
  key: Joi.string().required()
});

export const settingIdParamSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});