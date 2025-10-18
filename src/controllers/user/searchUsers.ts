import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import { getOnlineUserIds } from '@/utils/presence';
import type { Prisma } from '../../generated/prisma';

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const { q, page = '1', limit = '20', sortBy = 'relevance', filter = 'verified' } = req.query;

    if (!q || typeof q !== 'string') {
      throw createError('Search query is required', 400);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const whereBase: Prisma.UserWhereInput = {
      isActive: true,
      isBanned: false,
      OR: [
        { username: { contains: q as string, mode: 'insensitive' } },
        { displayName: { contains: q as string, mode: 'insensitive' } },
      ],
    };

    const select = {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      bio: true,
      isVerified: true,
      stats: true,
      createdAt: true,
      showOnlineStatus: true,
    };

    let users = await prisma.user.findMany({
      where: filter === 'verified' ? { ...whereBase, isVerified: true } : whereBase,
      select,
      orderBy: sortBy === 'newest' ? { createdAt: 'desc' } : { createdAt: 'desc' },
    });

    const onlineIds = new Set(getOnlineUserIds());

    const liveStreams = await prisma.liveStream.findMany({
      where: { status: 'LIVE' },
      select: { streamerId: true },
    });
    const liveStreamerIds = new Set(liveStreams.map((s) => s.streamerId));

    if (filter === 'online') {
      users = users.filter((u) => u.showOnlineStatus && onlineIds.has(u.id));
    } else if (filter === 'live') {
      users = users.filter((u) => liveStreamerIds.has(u.id));
    }

    const readNum = (stats: unknown, key: string): number => {
      const obj = typeof stats === 'object' && stats !== null ? (stats as Record<string, unknown>) : {};
      const val = obj[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const n = parseFloat(val);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    if (sortBy === 'followers') {
      users = users.sort((a, b) => {
        const af = readNum(a.stats, 'followers') || readNum(a.stats, 'followersCount');
        const bf = readNum(b.stats, 'followers') || readNum(b.stats, 'followersCount');
        return bf - af;
      });
    } else if (sortBy === 'level') {
      users = users.sort((a, b) => {
        const al = readNum(a.stats, 'level');
        const bl = readNum(b.stats, 'level');
        return bl - al;
      });
    }

    const paginated = users.slice(skip, skip + limitNum);

    const mapped = paginated.map((u) => {
      const stats = typeof u.stats === 'object' && u.stats !== null ? (u.stats as Record<string, unknown>) : {};
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio,
        isVerified: u.isVerified,
        isOnline: u.showOnlineStatus ? onlineIds.has(u.id) : false,
        isLive: liveStreamerIds.has(u.id),
        level: readNum(stats, 'level'),
        followersCount: readNum(stats, 'followers') || readNum(stats, 'followersCount'),
        totalStreams: readNum(stats, 'totalStreams') || readNum(stats, 'streams'),
        createdAt: u.createdAt,
      };
    });

    const total = users.length;

    res.json({
      success: true,
      data: {
        users: mapped,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Search users failed', { error, query: req.query });
    throw error;
  }
}