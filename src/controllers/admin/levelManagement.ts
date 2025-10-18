// Top-level imports and helpers
import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

// Typed helpers to avoid `any`
type LevelSettingsShape = {
  baseXpRequired: number;
  xpMultiplier: number;
  maxLevel: number;
  levelRewards: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

// Seviye ayarlarını getir
export const getLevelSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const levelSettingData = await prisma.systemSetting.findUnique({
      where: { key: 'level_settings' }
    });

    let levelSettings: LevelSettingsShape = {
      baseXpRequired: 100,
      xpMultiplier: 1.5,
      maxLevel: 100,
      levelRewards: {}
    };

    if (levelSettingData?.value !== undefined && levelSettingData?.value !== null) {
      const raw = levelSettingData.value;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (isRecord(parsed)) {
            const incoming = parsed as Partial<LevelSettingsShape>;
            levelSettings = { ...levelSettings, ...incoming };
          }
        } catch (error) {
          logger.error('Error parsing level settings:', error);
        }
      } else if (isRecord(raw)) {
        const incoming = raw as unknown as Partial<LevelSettingsShape>;
        levelSettings = { ...levelSettings, ...incoming };
      }
    }

    res.json({
      success: true,
      data: levelSettings
    });
  } catch (error) {
    logger.error('Error fetching level settings:', error);
    res.status(500).json({
      success: false,
      message: 'Seviye ayarları getirilirken hata oluştu'
    });
  }
};

// Seviye ayarlarını güncelle
export const updateLevelSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { baseXpRequired, xpMultiplier, maxLevel, levelRewards } = req.body;

    // Validasyon
    if (baseXpRequired && (typeof baseXpRequired !== 'number' || baseXpRequired < 1)) {
      res.status(400).json({
        success: false,
        message: 'baseXpRequired pozitif bir sayı olmalıdır'
      });
      return;
    }

    if (xpMultiplier && (typeof xpMultiplier !== 'number' || xpMultiplier < 1)) {
      res.status(400).json({
        success: false,
        message: 'xpMultiplier 1 veya daha büyük olmalıdır'
      });
      return;
    }

    if (maxLevel && (typeof maxLevel !== 'number' || maxLevel < 1)) {
      res.status(400).json({
        success: false,
        message: 'maxLevel pozitif bir sayı olmalıdır'
      });
      return;
    }

    const currentSettings = await prisma.systemSetting.findUnique({
      where: { key: 'level_settings' }
    });

    let settings: LevelSettingsShape = {
      baseXpRequired: 100,
      xpMultiplier: 1.5,
      maxLevel: 100,
      levelRewards: {}
    };

    if (currentSettings?.value !== undefined && currentSettings?.value !== null) {
      const raw = currentSettings.value;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (isRecord(parsed)) {
            const incoming = parsed as Partial<LevelSettingsShape>;
            settings = { ...settings, ...incoming };
          }
        } catch (error) {
          logger.error('Error parsing current level settings:', error);
        }
      } else if (isRecord(raw)) {
        const incoming = raw as unknown as Partial<LevelSettingsShape>;
        settings = { ...settings, ...incoming };
      }
    }

    const newSettings: LevelSettingsShape = {
      ...settings,
      ...(typeof baseXpRequired === 'number' ? { baseXpRequired } : {}),
      ...(typeof xpMultiplier === 'number' ? { xpMultiplier } : {}),
      ...(typeof maxLevel === 'number' ? { maxLevel } : {}),
      ...(isRecord(levelRewards) ? { levelRewards } : {})
    };

    await prisma.systemSetting.upsert({
      where: { key: 'level_settings' },
      update: { value: JSON.stringify(newSettings) },
      create: {
        key: 'level_settings',
        value: JSON.stringify(newSettings)
      }
    });

    logger.info('Level settings updated by admin', newSettings);

    res.json({
      success: true,
      message: 'Seviye ayarları başarıyla güncellendi',
      data: newSettings
    });
  } catch (error) {
    logger.error('Error updating level settings:', error);
    res.status(500).json({
      success: false,
      message: 'Seviye ayarları güncellenirken hata oluştu'
    });
  }
};

// Kullanıcı seviye istatistikleri
export const getUserLevelStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, sortBy = 'level', sortOrder = 'desc' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sıralama seçenekleri
    const validSortFields = ['level', 'xp', 'username', 'createdAt'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'level';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    // Toplam kullanıcı sayısı
    const totalUsers = await prisma.user.count();

    // Kullanıcıları getir
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        level: true,
        xp: true,
        createdAt: true
      },
      orderBy: {
        [sortField]: order
      },
      skip,
      take: limitNum
    });

    // Seviye dağılımı
    const levelDistribution = await prisma.user.groupBy({
      by: ['level'],
      _count: {
        id: true
      },
      orderBy: {
        level: 'asc'
      }
    });

    // En yüksek seviye ve XP
    const topUser = await prisma.user.findFirst({
      select: {
        username: true,
        level: true,
        xp: true
      },
      orderBy: [
        { level: 'desc' },
        { xp: 'desc' }
      ]
    });

    // Ortalama seviye
    const avgStats = await prisma.user.aggregate({
      _avg: {
        level: true,
        xp: true
      }
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limitNum)
        },
        statistics: {
          totalUsers,
          averageLevel: Math.round(avgStats._avg.level ?? 1),
          averageXp: Math.round(avgStats._avg.xp ?? 0),
          topUser,
          levelDistribution: levelDistribution.map((dist: { level: number; _count: { id: number } }) => ({
            level: dist.level,
            userCount: dist._count.id
          }))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user level stats:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı seviye istatistikleri getirilirken hata oluştu'
    });
  }
};

// Kullanıcı seviyesini manuel güncelle
export const updateUserLevel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { level, xp } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gereklidir'
      });
      return;
    }

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, level: true, xp: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
      return;
    }

    // Güncelleme verilerini hazırla
    type UserUpdateData = { level?: number; xp?: number };
    const updateData: UserUpdateData = {};
    if (typeof level === 'number' && level >= 1) {
      updateData.level = level;
    }
    if (typeof xp === 'number' && xp >= 0) {
      updateData.xp = xp;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Güncellenecek geçerli veri bulunamadı'
      });
      return;
    }

    // Kullanıcıyı güncelle
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        level: true,
        xp: true
      }
    });

    logger.info('User level manually updated by admin', {
      userId,
      oldLevel: user.level,
      newLevel: updatedUser.level,
      oldXp: user.xp,
      newXp: updatedUser.xp
    });

    res.json({
      success: true,
      message: 'Kullanıcı seviyesi başarıyla güncellendi',
      data: {
        user: updatedUser,
        changes: {
          level: user.level !== updatedUser.level,
          xp: user.xp !== updatedUser.xp
        }
      }
    });
  } catch (error) {
    logger.error('Error updating user level:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı seviyesi güncellenirken hata oluştu'
    });
  }
};

// Seviye hesaplama fonksiyonu (yardımcı endpoint)
export const calculateLevelFromXp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { xp } = req.query;

    if (!xp || isNaN(Number(xp))) {
      res.status(400).json({
        success: false,
        message: 'Geçerli bir XP değeri gereklidir'
      });
      return;
    }

    const xpAmount = parseInt(xp as string);

    const levelSettingData = await prisma.systemSetting.findUnique({
      where: { key: 'level_settings' }
    });

    let settings: { baseXpRequired: number; xpMultiplier: number; maxLevel: number } = {
      baseXpRequired: 100,
      xpMultiplier: 1.5,
      maxLevel: 100
    };

    if (levelSettingData?.value !== undefined && levelSettingData?.value !== null) {
      const raw = levelSettingData.value;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (isRecord(parsed)) {
            const incoming = parsed as Partial<typeof settings>;
            settings = { ...settings, ...incoming };
          }
        } catch (error) {
          logger.error('Error parsing level settings:', error);
        }
      } else if (isRecord(raw)) {
        const incoming = raw as unknown as Partial<typeof settings>;
        settings = { ...settings, ...incoming };
      }
    }

    let level = 1;
    let totalXpRequired = 0;
    let currentLevelXpRequired = settings.baseXpRequired;

    while (level < settings.maxLevel && totalXpRequired + currentLevelXpRequired <= xpAmount) {
      totalXpRequired += currentLevelXpRequired;
      level++;
      currentLevelXpRequired = Math.floor(settings.baseXpRequired * Math.pow(settings.xpMultiplier, level - 1));
    }

    // Bir sonraki seviye için gereken XP
    const nextLevelXpRequired = level < settings.maxLevel ? currentLevelXpRequired : 0;
    const currentLevelProgress = xpAmount - totalXpRequired;

    res.json({
      success: true,
      data: {
        currentXp: xpAmount,
        currentLevel: level,
        currentLevelProgress,
        nextLevelXpRequired,
        progressPercentage: nextLevelXpRequired > 0 ? Math.round((currentLevelProgress / nextLevelXpRequired) * 100) : 100,
        isMaxLevel: level >= settings.maxLevel
      }
    });
  } catch (error) {
    logger.error('Error calculating level from XP:', error);
    res.status(500).json({
      success: false,
      message: 'Seviye hesaplanırken hata oluştu'
    });
  }
};