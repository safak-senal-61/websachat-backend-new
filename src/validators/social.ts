import Joi from 'joi';

// Follow validation schemas
export const followUserSchema = Joi.object({
  userId: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/),    // 24-hex (ObjectId)
    Joi.string().pattern(/^c[a-z0-9]{24,}$/)      // CUID (Prisma)
  )
  .required()
  .messages({
    'string.pattern.base': 'Geçersiz kullanıcı ID formatı',
    'any.required': 'Kullanıcı ID gerekli',
  }),
  notificationsEnabled: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Bildirim ayarı boolean değer olmalı',
    }),
});

export const unfollowUserSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz kullanıcı ID formatı',
      'any.required': 'Kullanıcı ID gerekli',
    }),
});

export const getFollowersSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Sayfa numarası sayı olmalı',
      'number.integer': 'Sayfa numarası tam sayı olmalı',
      'number.min': 'Sayfa numarası en az 1 olmalı',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit sayı olmalı',
      'number.integer': 'Limit tam sayı olmalı',
      'number.min': 'Limit en az 1 olmalı',
      'number.max': 'Limit en fazla 100 olabilir',
    }),
  search: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .messages({
      'string.min': 'Arama terimi en az 2 karakter olmalı',
      'string.max': 'Arama terimi en fazla 50 karakter olabilir',
    }),
});

export const blockUserSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz kullanıcı ID formatı',
      'any.required': 'Kullanıcı ID gerekli',
    }),
  reason: Joi.string()
    .valid('harassment', 'spam', 'inappropriate_content', 'fake_account', 'other')
    .messages({
      'any.only': 'Geçersiz engelleme nedeni',
    }),
});

// Gift validation schemas
export const sendGiftSchema = Joi.object({
  receiverId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz alıcı ID formatı',
      'any.required': 'Alıcı ID gerekli',
    }),
  streamId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Geçersiz yayın ID formatı',
    }),
  giftType: Joi.string()
    .valid(
      'rose', 'heart', 'diamond', 'crown', 'car', 'yacht', 'rocket',
      'fireworks', 'rainbow', 'unicorn', 'dragon', 'phoenix', 'galaxy',
      'treasure', 'castle', 'throne', 'meteor', 'comet', 'star'
    )
    .required()
    .messages({
      'any.only': 'Geçersiz hediye türü',
      'any.required': 'Hediye türü gerekli',
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(999)
    .default(1)
    .messages({
      'number.base': 'Miktar sayı olmalı',
      'number.integer': 'Miktar tam sayı olmalı',
      'number.min': 'Miktar en az 1 olmalı',
      'number.max': 'Miktar en fazla 999 olabilir',
    }),
  message: Joi.string()
    .max(200)
    .trim()
    .allow('')
    .messages({
      'string.max': 'Mesaj en fazla 200 karakter olabilir',
    }),
  isAnonymous: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Anonim ayarı boolean değer olmalı',
    }),
  isPublic: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Herkese açık ayarı boolean değer olmalı',
    }),
});

export const getGiftHistorySchema = Joi.object({
  type: Joi.string()
    .valid('sent', 'received', 'all')
    .default('all')
    .messages({
      'any.only': 'Geçersiz hediye geçmişi türü',
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Sayfa numarası sayı olmalı',
      'number.integer': 'Sayfa numarası tam sayı olmalı',
      'number.min': 'Sayfa numarası en az 1 olmalı',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit sayı olmalı',
      'number.integer': 'Limit tam sayı olmalı',
      'number.min': 'Limit en az 1 olmalı',
      'number.max': 'Limit en fazla 100 olabilir',
    }),
  giftType: Joi.string()
    .valid(
      'rose', 'heart', 'diamond', 'crown', 'car', 'yacht', 'rocket',
      'fireworks', 'rainbow', 'unicorn', 'dragon', 'phoenix', 'galaxy',
      'treasure', 'castle', 'throne', 'meteor', 'comet', 'star'
    )
    .messages({
      'any.only': 'Geçersiz hediye türü',
    }),
  startDate: Joi.date()
    .messages({
      'date.base': 'Başlangıç tarihi geçerli bir tarih olmalı',
    }),
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .messages({
      'date.base': 'Bitiş tarihi geçerli bir tarih olmalı',
      'date.min': 'Bitiş tarihi başlangıç tarihinden sonra olmalı',
    }),
});

export const getTopGiftersSchema = Joi.object({
  period: Joi.string()
    .valid('daily', 'weekly', 'monthly', 'yearly')
    .default('monthly')
    .messages({
      'any.only': 'Geçersiz dönem',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit sayı olmalı',
      'number.integer': 'Limit tam sayı olmalı',
      'number.min': 'Limit en az 1 olmalı',
      'number.max': 'Limit en fazla 100 olabilir',
    }),
});

// Comment validation schemas
export const createCommentSchema = Joi.object({
  streamId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz yayın ID formatı',
      'any.required': 'Yayın ID gerekli',
    }),
  content: Joi.string()
    .min(1)
    .max(500)
    .trim()
    .required()
    .messages({
      'string.min': 'Yorum içeriği en az 1 karakter olmalı',
      'string.max': 'Yorum içeriği en fazla 500 karakter olabilir',
      'any.required': 'Yorum içeriği gerekli',
    }),
  type: Joi.string()
    .valid('text', 'emoji', 'sticker', 'gif')
    .default('text')
    .messages({
      'any.only': 'Geçersiz yorum türü',
    }),
  parentCommentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Geçersiz üst yorum ID formatı',
    }),
  metadata: Joi.object({
    emojis: Joi.array().items(Joi.string().max(10)),
    stickerId: Joi.string().max(50),
    gifUrl: Joi.string().uri().max(500),
    mentions: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ),
    hashtags: Joi.array().items(Joi.string().max(50)),
  }).messages({
    'object.base': 'Metadata geçerli bir obje olmalı',
  }),
});

export const updateCommentSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(500)
    .trim()
    .required()
    .messages({
      'string.min': 'Yorum içeriği en az 1 karakter olmalı',
      'string.max': 'Yorum içeriği en fazla 500 karakter olabilir',
      'any.required': 'Yorum içeriği gerekli',
    }),
});

export const getCommentsSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Sayfa numarası sayı olmalı',
      'number.integer': 'Sayfa numarası tam sayı olmalı',
      'number.min': 'Sayfa numarası en az 1 olmalı',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.base': 'Limit sayı olmalı',
      'number.integer': 'Limit tam sayı olmalı',
      'number.min': 'Limit en az 1 olmalı',
      'number.max': 'Limit en fazla 100 olabilir',
    }),
  sortBy: Joi.string()
    .valid('newest', 'oldest', 'popular')
    .default('newest')
    .messages({
      'any.only': 'Geçersiz sıralama türü',
    }),
  includeReplies: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Cevapları dahil et ayarı boolean değer olmalı',
    }),
});

export const moderateCommentSchema = Joi.object({
  action: Joi.string()
    .valid('pin', 'unpin', 'hide', 'unhide', 'delete', 'approve', 'flag')
    .required()
    .messages({
      'any.only': 'Geçersiz moderasyon eylemi',
      'any.required': 'Moderasyon eylemi gerekli',
    }),
  reason: Joi.string()
    .max(200)
    .trim()
    .messages({
      'string.max': 'Neden en fazla 200 karakter olabilir',
    }),
});

export const reportCommentSchema = Joi.object({
  reason: Joi.string()
    .valid(
      'spam', 'harassment', 'hate_speech', 'violence', 'nudity',
      'misinformation', 'copyright', 'impersonation', 'other'
    )
    .required()
    .messages({
      'any.only': 'Geçersiz şikayet nedeni',
      'any.required': 'Şikayet nedeni gerekli',
    }),
  description: Joi.string()
    .max(500)
    .trim()
    .messages({
      'string.max': 'Açıklama en fazla 500 karakter olabilir',
    }),
});

// Reaction validation schemas
export const addReactionSchema = Joi.object({
  targetId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz hedef ID formatı',
      'any.required': 'Hedef ID gerekli',
    }),
  targetType: Joi.string()
    .valid('stream', 'comment', 'user', 'gift')
    .required()
    .messages({
      'any.only': 'Geçersiz hedef türü',
      'any.required': 'Hedef türü gerekli',
    }),
  reactionType: Joi.string()
    .valid(
      'like', 'love', 'laugh', 'wow', 'sad', 'angry',
      'fire', 'heart_eyes', 'clap', 'thumbs_up', 'thumbs_down',
      'party', 'mind_blown', 'crying_laughing', 'heart_fire',
      'wave', 'peace', 'ok_hand', 'muscle', 'pray',
      'fireworks', 'confetti', 'sparkles', 'rainbow', 'lightning',
      'custom'
    )
    .required()
    .messages({
      'any.only': 'Geçersiz tepki türü',
      'any.required': 'Tepki türü gerekli',
    }),
  intensity: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .default(3)
    .messages({
      'number.base': 'Yoğunluk sayı olmalı',
      'number.integer': 'Yoğunluk tam sayı olmalı',
      'number.min': 'Yoğunluk en az 1 olmalı',
      'number.max': 'Yoğunluk en fazla 5 olabilir',
    }),
  position: Joi.object({
    x: Joi.number().min(0).max(100).required(),
    y: Joi.number().min(0).max(100).required(),
  }).messages({
    'object.base': 'Pozisyon geçerli bir obje olmalı',
  }),
  customEmoji: Joi.object({
    name: Joi.string().max(50).required(),
    url: Joi.string().uri().max(500).required(),
    animated: Joi.boolean().default(false),
  }).when('reactionType', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }).messages({
    'object.base': 'Özel emoji geçerli bir obje olmalı',
  }),
  isAnonymous: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Anonim ayarı boolean değer olmalı',
    }),
  duration: Joi.number()
    .integer()
    .min(100)
    .max(10000)
    .default(2000)
    .messages({
      'number.base': 'Süre sayı olmalı',
      'number.integer': 'Süre tam sayı olmalı',
      'number.min': 'Süre en az 100ms olmalı',
      'number.max': 'Süre en fazla 10000ms olabilir',
    }),
});

export const getReactionsSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Sayfa numarası sayı olmalı',
      'number.integer': 'Sayfa numarası tam sayı olmalı',
      'number.min': 'Sayfa numarası en az 1 olmalı',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.base': 'Limit sayı olmalı',
      'number.integer': 'Limit tam sayı olmalı',
      'number.min': 'Limit en az 1 olmalı',
      'number.max': 'Limit en fazla 100 olabilir',
    }),
  reactionType: Joi.string()
    .valid(
      'like', 'love', 'laugh', 'wow', 'sad', 'angry',
      'fire', 'heart_eyes', 'clap', 'thumbs_up', 'thumbs_down',
      'party', 'mind_blown', 'crying_laughing', 'heart_fire',
      'wave', 'peace', 'ok_hand', 'muscle', 'pray',
      'fireworks', 'confetti', 'sparkles', 'rainbow', 'lightning',
      'custom'
    )
    .messages({
      'any.only': 'Geçersiz tepki türü',
    }),
  targetType: Joi.string()
    .valid('stream', 'comment', 'user', 'gift')
    .messages({
      'any.only': 'Geçersiz hedef türü',
    }),
  startDate: Joi.date()
    .messages({
      'date.base': 'Başlangıç tarihi geçerli bir tarih olmalı',
    }),
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .messages({
      'date.base': 'Bitiş tarihi geçerli bir tarih olmalı',
      'date.min': 'Bitiş tarihi başlangıç tarihinden sonra olmalı',
    }),
});

export const getReactionStatsSchema = Joi.object({
  period: Joi.string()
    .valid('hourly', 'daily', 'weekly', 'monthly')
    .default('daily')
    .messages({
      'any.only': 'Geçersiz dönem',
    }),
  targetType: Joi.string()
    .valid('stream', 'comment', 'user', 'gift')
    .messages({
      'any.only': 'Geçersiz hedef türü',
    }),
});

// Parameter validation schemas
export const userIdParamSchema = Joi.object({
  userId: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/),    // 24-hex (ObjectId)
    Joi.string().pattern(/^c[a-z0-9]{24,}$/)      // CUID (Prisma)
  )
  .required()
  .messages({
    'string.pattern.base': 'Geçersiz kullanıcı ID formatı',
    'any.required': 'Kullanıcı ID gerekli',
  }),
});

export const commentIdParamSchema = Joi.object({
  commentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz yorum ID formatı',
      'any.required': 'Yorum ID gerekli',
    }),
});

export const giftIdParamSchema = Joi.object({
  giftId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz hediye ID formatı',
      'any.required': 'Hediye ID gerekli',
    }),
});

export const streamIdParamSchema = Joi.object({
  streamId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçersiz yayın ID formatı',
      'any.required': 'Yayın ID gerekli',
    }),
});