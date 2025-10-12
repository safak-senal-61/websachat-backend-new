import { Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';

export async function getUserById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      throw createError('User id is required', 400);
    }

    const currentUserId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        bio: true,
        gender: true,
        location: true,
        socialLinks: true,
        isVerified: true,
        isActive: true,
        isBanned: true,
        stats: true,
        lastLoginAt: true,
        createdAt: true,
        dateOfBirth: true
      }
    });
    
    if (!user) {
      throw createError('User not found', 404);
    }

    // Kullanıcı engelli veya aktif değilse ve kendi profili değilse/admin değilse gizle
    if ((user.isBanned || !user.isActive) && currentUserId !== id && req.user?.role !== 'admin') {
      throw createError('User not found', 404);
    }

    const isOwnProfile = currentUserId === id;
    const isAdmin = req.user?.role === 'admin';

    const loc =
      typeof user.location === 'object' && user.location !== null
        ? (user.location as Record<string, unknown>)
        : {};
    const statsObj =
      typeof user.stats === 'object' && user.stats !== null
        ? (user.stats as Record<string, unknown>)
        : {};

    const readNum = (obj: Record<string, unknown>, key: string): number => {
      const v = obj[key];
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    const userResponse = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      gender: user.gender,
      country: (loc['country'] as string | null) ?? null,
      city: (loc['city'] as string | null) ?? null,
      isVerified: user.isVerified,
      followersCount: readNum(statsObj, 'followersCount'),
      followingCount: readNum(statsObj, 'followingCount'),
      totalStreams: readNum(statsObj, 'totalStreams'),
      totalWatchTime: readNum(statsObj, 'totalWatchTime'),
      socialLinks: user.socialLinks,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };

    // Kendi profili veya admin ise ek özel bilgileri göster
    if (isOwnProfile || isAdmin) {
      (userResponse as Record<string, unknown>).email = user.email;
      (userResponse as Record<string, unknown>).dateOfBirth = user.dateOfBirth;
    }

    res.json({
      success: true,
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    logger.error('Get user by ID failed', { error, userId: req.params.id });
    throw error;
  }
}