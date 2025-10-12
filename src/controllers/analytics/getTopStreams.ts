import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';

type SortKey = 'viewers' | 'peak_viewers' | 'watch_time' | 'revenue' | 'gifts_value' | 'engagement';

interface StreamStats {
  totalViewers?: number;
  peakViewers?: number;
  totalDuration?: number;
  totalRevenue?: number;
  totalGiftsValue?: number;
  engagementRate?: number;
}

type StreamWithStats = {
  stats: unknown;
};

export async function getTopStreams(req: Request, res: Response): Promise<Response> {
  try {
    const {
      period = 'weekly',
      startDate,
      endDate,
      category,
      sortBy = 'viewers',
      limit = '10',
      page = '1',
    } = req.query as Partial<{
      period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all' | string;
      startDate: string;
      endDate: string;
      category: $Enums.StreamCategory | string;
      sortBy: SortKey | string;
      limit: string | number;
      page: string | number;
    }>;

    // Filtreleri kur
    const where: Prisma.LiveStreamWhereInput = {};
    if (category) {
      // Enum uyumluluğu için $Enums.StreamCategory cast kullanımı (geçerli kategori stringleri ile çalışır)
      where.category = category as $Enums.StreamCategory;
    }

    const startDateObj = startDate ? new Date(String(startDate)) : undefined;
    const endDateObj = endDate ? new Date(String(endDate)) : undefined;

    if (startDateObj || endDateObj) {
      where.createdAt = {};
      if (startDateObj) where.createdAt.gte = startDateObj;
      if (endDateObj) where.createdAt.lte = endDateObj;
    } else if (period !== 'all') {
      const now = new Date();
      const periodMap: Record<'daily' | 'weekly' | 'monthly' | 'yearly', number> = {
        daily: 1, weekly: 7, monthly: 30, yearly: 365
      };
      const days = periodMap[(period as keyof typeof periodMap)] ?? 7;
      where.createdAt = { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
    }

    // Sayfalama
    const limitNum = Number(limit);
    const pageNum = Number(page);
    const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 10;
    const safePage = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;

    // Tümü çekilip bellek üzerinde sıralanacak
    const [allStreams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        include: {
          streamer: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
      }),
      prisma.liveStream.count({ where }),
    ]);

    const getMetricValue = (stream: StreamWithStats, key: SortKey): number => {
      const stats = (stream?.stats as StreamStats) || {};
      switch (key) {
      case 'viewers':
        return Number(stats.totalViewers ?? 0);
      case 'peak_viewers':
        return Number(stats.peakViewers ?? 0);
      case 'watch_time':
        return Number(stats.totalDuration ?? 0);
      case 'revenue':
        return Number(stats.totalRevenue ?? 0);
      case 'gifts_value':
        return Number(stats.totalGiftsValue ?? 0);
      case 'engagement':
        return Number(stats.engagementRate ?? 0);
      default:
        return Number(stats.totalViewers ?? 0);
      }
    };

    const sortKey: SortKey =
      (['viewers', 'peak_viewers', 'watch_time', 'revenue', 'gifts_value', 'engagement'] as SortKey[]).includes(
        sortBy as SortKey
      )
        ? (sortBy as SortKey)
        : 'viewers';

    // Bellek üzerinde azalan sıralama
    const sorted = allStreams.sort(
      (a: StreamWithStats, b: StreamWithStats) => getMetricValue(b, sortKey) - getMetricValue(a, sortKey)
    );

    // Sayfalama dilimi
    const startIndex = (safePage - 1) * safeLimit;
    const streams = sorted.slice(startIndex, startIndex + safeLimit);

    return res.json({
      success: true,
      message: 'Top streams retrieved successfully',
      data: {
        streams,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
        filters: { period, category, sortBy: sortKey },
      },
    });
  } catch (error: unknown) {
    console.error('Get top streams error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve top streams' });
  }
}