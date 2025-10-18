// imports for getProfile
import { Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import { formatDiamondBalance } from '../../utils/currency';

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
            streams: true,
          },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    type UserStats = { totalStreams?: number; totalWatchTime?: number; level?: number };
    type LocationInfo = { country?: string | null; city?: string | null };
    const stats: UserStats =
      user.stats && typeof user.stats === 'object' ? (user.stats as UserStats) : {};
    const location: LocationInfo =
      user.location && typeof user.location === 'object' ? (user.location as LocationInfo) : {};

    // Sanal bakiye (coins/diamonds) bilgisi
    const virtualBalance = await prisma.virtualBalance.findUnique({
      where: { userId: userId },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          bio: user.bio,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          country: location?.country || null,
          city: location?.city || null,
          isVerified: user.isVerified,
          followersCount: user._count?.followers ?? 0,
          followingCount: user._count?.following ?? 0,
          totalStreams: user._count?.streams ?? (stats?.totalStreams || 0),
          totalWatchTime: stats?.totalWatchTime || 0,
          // Eklenen alanlar:
          level: typeof stats.level === 'number' ? stats.level : 0,
          coins: virtualBalance?.coins ?? 0,
          diamonds: virtualBalance?.diamonds ?? 0,
          diamondBalanceTL: formatDiamondBalance(virtualBalance?.diamonds ?? 0), // TL formatında elmas bakiyesi
          streamingSettings: user.streamingSettings,
          socialLinks: user.socialLinks,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile failed', { error, userId: req.user?.id });
    throw error;
  }
}