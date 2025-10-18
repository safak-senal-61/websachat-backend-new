import Joi from 'joi';

// Stream Analytics Schemas
export const streamAnalyticsSchema = Joi.object({
  streamId: Joi.string().optional(),
  userId: Joi.string().optional(),
  period: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly', 'yearly', 'all').default('daily'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  timezone: Joi.string().default('UTC'),
  metrics: Joi.array().items(
    Joi.string().valid(
      'viewers', 'peak_viewers', 'average_viewers', 'total_watch_time',
      'chat_messages', 'gifts_received', 'gifts_value', 'followers_gained',
      'revenue', 'engagement_rate', 'retention_rate', 'bounce_rate'
    )
  ).optional(),
  groupBy: Joi.string().valid('hour', 'day', 'week', 'month', 'year').optional()
});

export const topStreamsSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('weekly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  category: Joi.string().optional(),
  sortBy: Joi.string().valid(
    'viewers', 'peak_viewers', 'watch_time', 'revenue', 'gifts_value', 'engagement'
  ).default('viewers'),
  limit: Joi.number().integer().min(1).max(100).default(10),
  page: Joi.number().integer().min(1).default(1)
});

export const streamPerformanceSchema = Joi.object({
  streamId: Joi.string().required(),
  includeComparisons: Joi.boolean().default(false),
  includeBreakdown: Joi.boolean().default(true),
  includeAudience: Joi.boolean().default(true)
});

export const streamRevenueSchema = Joi.object({
  streamId: Joi.string().optional(),
  userId: Joi.string().optional(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  revenueType: Joi.string().valid('gifts', 'subscriptions', 'donations', 'all').default('all'),
  currency: Joi.string().default('USD'),
  groupBy: Joi.string().valid('day', 'week', 'month', 'year').optional()
});

// User Analytics Schemas
export const userAnalyticsSchema = Joi.object({
  userId: Joi.string().optional(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userType: Joi.string().valid('streamer', 'viewer', 'all').default('all'),
  metrics: Joi.array().items(
    Joi.string().valid(
      'active_users', 'new_users', 'returning_users', 'session_duration',
      'streams_watched', 'gifts_sent', 'comments_posted', 'follows_made',
      'revenue_generated', 'churn_rate', 'retention_rate'
    )
  ).optional(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'year').optional()
});

export const userEngagementSchema = Joi.object({
  userId: Joi.string().optional(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('weekly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  engagementType: Joi.string().valid('comments', 'gifts', 'reactions', 'follows', 'all').default('all'),
  includeBreakdown: Joi.boolean().default(true)
});

export const userRetentionSchema = Joi.object({
  cohortPeriod: Joi.string().valid('daily', 'weekly', 'monthly').default('weekly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userSegment: Joi.string().valid('new', 'returning', 'premium', 'all').default('all'),
  retentionPeriods: Joi.number().integer().min(1).max(12).default(8)
});

export const topUsersSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userType: Joi.string().valid('streamers', 'gifters', 'commenters', 'followers').default('streamers'),
  sortBy: Joi.string().valid(
    'revenue', 'viewers', 'gifts_sent', 'gifts_received', 'comments', 'followers', 'following'
  ).default('revenue'),
  limit: Joi.number().integer().min(1).max(100).default(10),
  page: Joi.number().integer().min(1).default(1)
});

// Revenue Analytics Schemas
export const revenueAnalyticsSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  revenueType: Joi.string().valid('gifts', 'subscriptions', 'donations', 'commissions', 'all').default('all'),
  currency: Joi.string().default('USD'),
  groupBy: Joi.string().valid('day', 'week', 'month', 'year').optional(),
  includeProjections: Joi.boolean().default(false),
  includeBreakdown: Joi.boolean().default(true)
});

export const revenueBreakdownSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  breakdownBy: Joi.string().valid('source', 'user', 'stream', 'category', 'payment_method').default('source'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  includePercentages: Joi.boolean().default(true)
});

export const revenueProjectionSchema = Joi.object({
  projectionPeriod: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').default('monthly'),
  projectionMonths: Joi.number().integer().min(1).max(12).default(3),
  includeSeasonality: Joi.boolean().default(true),
  confidenceLevel: Joi.number().min(0.8).max(0.99).default(0.95)
});

// Platform Analytics Schemas
export const platformAnalyticsSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('daily'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  metrics: Joi.array().items(
    Joi.string().valid(
      'total_users', 'active_users', 'new_registrations', 'total_streams',
      'live_streams', 'total_watch_time', 'total_revenue', 'total_gifts',
      'total_comments', 'total_reactions', 'server_uptime', 'error_rate'
    )
  ).optional(),
  includeComparisons: Joi.boolean().default(true)
});

export const platformHealthSchema = Joi.object({
  includePerformance: Joi.boolean().default(true),
  includeErrors: Joi.boolean().default(true),
  includeUptime: Joi.boolean().default(true),
  includeCapacity: Joi.boolean().default(true),
  timeRange: Joi.string().valid('1h', '6h', '24h', '7d', '30d').default('24h')
});

// Audience Analytics Schemas
export const audienceAnalyticsSchema = Joi.object({
  streamId: Joi.string().optional(),
  userId: Joi.string().optional(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  demographicType: Joi.string().valid('age', 'gender', 'location', 'device', 'all').default('all'),
  includeEngagement: Joi.boolean().default(true)
});

export const audienceSegmentationSchema = Joi.object({
  segmentBy: Joi.string().valid('behavior', 'demographics', 'engagement', 'revenue').default('behavior'),
  period: Joi.string().valid('weekly', 'monthly', 'quarterly').default('monthly'),
  includeGrowth: Joi.boolean().default(true),
  includeRetention: Joi.boolean().default(true)
});

// Real-time Analytics Schemas
export const realTimeAnalyticsSchema = Joi.object({
  streamId: Joi.string().optional(),
  metrics: Joi.array().items(
    Joi.string().valid(
      'current_viewers', 'chat_activity', 'gift_activity', 'new_followers',
      'engagement_rate', 'viewer_locations', 'device_types'
    )
  ).optional(),
  timeWindow: Joi.string().valid('1m', '5m', '15m', '30m', '1h').default('5m')
});

export const liveStreamStatsSchema = Joi.object({
  streamId: Joi.string().required(),
  includeHistory: Joi.boolean().default(true),
  historyDuration: Joi.string().valid('1h', '6h', '24h').default('1h'),
  includeComparisons: Joi.boolean().default(false)
});

// Export Analytics Schemas
export const exportAnalyticsSchema = Joi.object({
  reportType: Joi.string().valid(
    'stream_performance', 'user_engagement', 'revenue_summary', 
    'audience_demographics', 'platform_overview'
  ).required(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'custom').default('monthly'),
  startDate: Joi.date().when('period', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  endDate: Joi.date().when('period', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  format: Joi.string().valid('json', 'csv', 'xlsx', 'pdf').default('json'),
  includeCharts: Joi.boolean().default(false),
  filters: Joi.object().optional(),
  email: Joi.string().email().optional()
});

// Custom Report Schemas
export const customReportSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  metrics: Joi.array().items(Joi.string()).min(1).required(),
  dimensions: Joi.array().items(Joi.string()).optional(),
  filters: Joi.object().optional(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'custom').default('monthly'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  groupBy: Joi.string().optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  schedule: Joi.object({
    enabled: Joi.boolean().default(false),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
    dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
    recipients: Joi.array().items(Joi.string().email()).optional()
  }).optional()
});

// Parameter Validation Schemas
export const streamIdParamSchema = Joi.object({
  streamId: Joi.string().required()
});

export const userIdParamSchema = Joi.object({
  userId: Joi.string()
    .pattern(new RegExp('^c[a-z0-9]{24}$'))
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required',
    }),
});

export const reportIdParamSchema = Joi.object({
  reportId: Joi.string().required()
});

// Common Query Schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'all').default('monthly')
});

export const sortingSchema = Joi.object({
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});