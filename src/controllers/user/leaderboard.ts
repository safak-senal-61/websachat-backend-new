import type { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

/**
 * Global leaderboard by level/xp. Only active and not banned users.
 */
export async function getGlobalLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const { limit: limitRaw, sort: sortRaw } = req.query as { limit?: string; sort?: string };
    const limit = Math.min(Math.max(Number(limitRaw ?? 50), 1), 100);
    const sort = (sortRaw === 'xp' || sortRaw === 'level') ? sortRaw : 'level';

    const users = await prisma.user.findMany({
      where: { isActive: true, isBanned: false },
      select: { id: true, displayName: true, username: true, avatar: true, level: true, xp: true, isVerified: true },
      orderBy: [{ [sort]: 'desc' as const }, { xp: 'desc' }],
      take: limit,
    });

    const entries = users.map(u => ({
      userId: u.id,
      displayName: u.displayName ?? u.username,
      avatar: u.avatar ?? null,
      level: u.level,
      xp: u.xp,
      verified: u.isVerified ?? false,
    }));

    res.status(200).json({
      success: true,
      data: { entries, sort, limit },
    });
  } catch (err) {
    logger.error('getGlobalLeaderboard error', err);
    res.status(500).json({ success: false, message: 'Liderlik tablosu alınırken hata oluştu' });
  }
}