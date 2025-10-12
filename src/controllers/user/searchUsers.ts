import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const { q, page = '1', limit = '20', sortBy = 'relevance' } = req.query;

    if (!q || typeof q !== 'string') {
      throw createError('Search query is required', 400);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      isActive: true,
      isBanned: false,
      OR: [
        { username: { contains: q as string, mode: 'insensitive' as const } },
        { displayName: { contains: q as string, mode: 'insensitive' as const } },
      ],
    };

    const total = await prisma.user.count({ where });

    // Base selection fields
    const select = {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      bio: true,
      isVerified: true,
      stats: true,
      createdAt: true,
    };

    let users = await prisma.user.findMany({
      where,
      select,
      // DB-side sort only for "newest" or default relevance (createdAt)
      orderBy: sortBy === 'newest' ? { createdAt: 'desc' } : { createdAt: 'desc' },
    });

    // Güvenli sayı okuma yardımcı fonksiyonu
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

    // Application-side sorting for stats-based fields (JSON)
    if (sortBy === 'followers') {
      users = users.sort((a, b) => {
        const af = readNum(a.stats, 'followers');
        const bf = readNum(b.stats, 'followers');
        return bf - af;
      });
    } else if (sortBy === 'level') {
      users = users.sort((a, b) => {
        const al = readNum(a.stats, 'level');
        const bl = readNum(b.stats, 'level');
        return bl - al;
      });
    } else if (sortBy === 'relevance') {
      // Keep createdAt desc as a simple relevance proxy
    }

    // Paginate after sorting
    const paginated = users.slice(skip, skip + limitNum);

    // Map output to include derived stats fields for compatibility
    const mapped = paginated.map((u) => {
      const stats = typeof u.stats === 'object' && u.stats !== null ? (u.stats as Record<string, unknown>) : {};
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio,
        isVerified: u.isVerified,
        level: readNum(stats, 'level'),
        followersCount: readNum(stats, 'followers'),
        totalStreams: readNum(stats, 'totalStreams') || readNum(stats, 'streams'),
        createdAt: u.createdAt,
      };
    });

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