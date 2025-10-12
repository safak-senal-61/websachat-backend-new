import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export async function getTopUsers(req: Request, res: Response): Promise<void> {
  try {
    const { type = 'followers', limit = '50' } = req.query as { type?: string; limit?: string };
    let sortType = typeof type === 'string' ? type : 'followers';
    const limitNum = Number.isFinite(parseInt(limit as string, 10)) ? Math.max(1, Math.min(100, parseInt(limit as string, 10))) : 50;

    // Geçersiz type gelirse 'followers' kullan
    const allowedTypes = new Set(['followers', 'level', 'streams', 'watchtime']);
    if (!allowedTypes.has(sortType)) {
      sortType = 'followers';
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        stats: true,
      },
    });

    // stats JSON içinden güvenli sayı okuma
    const readStat = (stats: unknown, key: string): number => {
      const obj = typeof stats === 'object' && stats !== null ? (stats as Record<string, unknown>) : {};
      const val = obj[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const n = parseFloat(val);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    // Uygulama tarafında sıralama
    const sorted = users.slice().sort((a, b) => {
      const sa = a.stats as unknown;
      const sb = b.stats as unknown;
    
      switch (sortType) {
      case 'followers': {
        const fa = readStat(sa, 'followersCount');
        const fb = readStat(sb, 'followersCount');
        return fb - fa;
      }
      case 'level': {
        const la = readStat(sa, 'level');
        const lb = readStat(sb, 'level');
        if (lb !== la) return lb - la;
        const ea = readStat(sa, 'experience');
        const eb = readStat(sb, 'experience');
        return eb - ea;
      }
      case 'streams': {
        const ta = readStat(sa, 'totalStreams');
        const tb = readStat(sb, 'totalStreams');
        return tb - ta;
      }
      case 'watchtime': {
        const wa = readStat(sa, 'totalWatchTime');
        const wb = readStat(sb, 'totalWatchTime');
        return wb - wa;
      }
      default:
        return 0;
      }
    });

    const topUsers = sorted.slice(0, limitNum).map((user: (typeof users)[number], index: number) => {
      const s = user.stats as unknown;
      return {
        rank: index + 1,
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        followersCount: readStat(s, 'followersCount'),
        level: readStat(s, 'level'),
        experience: readStat(s, 'experience'),
        totalStreams: readStat(s, 'totalStreams'),
        totalWatchTime: readStat(s, 'totalWatchTime'),
      };
    });

    res.json({
      success: true,
      data: {
        users: topUsers,
        type: sortType,
      },
    });
  } catch (error) {
    logger.error('Get top users failed', { error, query: req.query });
    throw error;
  }
}