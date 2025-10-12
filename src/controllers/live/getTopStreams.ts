// Dosya: getTopStreams.ts - Fonksiyon: getTopStreams
import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { prisma } from '../../config/database';
// Yanlış:
// import type { Prisma } from '@prisma/client';
// Doğru:
import type { Prisma, StreamCategory as StreamCategoryType } from '../../generated/prisma';

interface LiveStreamStats {
  peakViewers?: number;
  totalViewers?: number;
  currentViewers?: number;
  totalDuration?: number;
  revenue?: number;
  totalComments?: number;
  totalLikes?: number;
  totalGifts?: number;
}

export async function getTopStreams(req: Request, res: Response): Promise<void> {
  try {
    const { period = 'daily', category, metric = 'peak_viewers', limit = 20 } = req.query;

    // Tarih aralığı
    const now = new Date();
    let from = new Date();
    const p = String(period).toLowerCase();
    if (p === 'daily') from.setDate(now.getDate() - 1);
    else if (p === 'weekly') from.setDate(now.getDate() - 7);
    else if (p === 'monthly') from.setMonth(now.getMonth() - 1);
    else if (p === 'yearly') from.setFullYear(now.getFullYear() - 1);
    else from.setDate(now.getDate() - 1);

    const where: Prisma.LiveStreamWhereInput = { createdAt: { gte: from } };
    if (category) {
      const upperCategory = String(category).toUpperCase() as StreamCategoryType;
      where.category = { equals: upperCategory };
    }

    const streams = await prisma.liveStream.findMany({
      where,
      // populate streamer gerekmiyorsa kaldırabilirsiniz
    });

    const filteredStreams = streams;

    const sortedStreams = filteredStreams.sort((a, b) => {
      const sa = (a.stats ?? {}) as LiveStreamStats;
      const sb = (b.stats ?? {}) as LiveStreamStats;
      switch (metric) {
      case 'peak_viewers':
        return (sb.peakViewers ?? 0) - (sa.peakViewers ?? 0);
      case 'total_viewers':
        return (sb.totalViewers ?? 0) - (sa.totalViewers ?? 0);
      case 'duration':
        return (sb.totalDuration ?? 0) - (sa.totalDuration ?? 0);
      case 'revenue':
        return (sb.revenue ?? 0) - (sa.revenue ?? 0);
      case 'engagement': {
        const ea = (sa.totalComments ?? 0) + (sa.totalLikes ?? 0) + (sa.totalGifts ?? 0);
        const eb = (sb.totalComments ?? 0) + (sb.totalLikes ?? 0) + (sb.totalGifts ?? 0);
        return eb - ea;
      }
      default:
        return (sb.peakViewers ?? 0) - (sa.peakViewers ?? 0);
      }
    });

    res.json({
      success: true,
      data: {
        streams: sortedStreams.slice(0, parseInt(limit as string)).map((stream, index) => {
          const s = (stream.stats ?? {}) as LiveStreamStats;
          const score =
            metric === 'peak_viewers' ? (s.peakViewers ?? 0) :
              metric === 'total_viewers' ? (s.totalViewers ?? 0) :
                metric === 'duration' ? (s.totalDuration ?? 0) :
                  metric === 'revenue' ? (s.revenue ?? 0) :
                    ((s.totalComments ?? 0) + (s.totalLikes ?? 0) + (s.totalGifts ?? 0));
          return {
            ...stream,
            rank: index + 1,
            score,
            technical: undefined,
          };
        }),
        period,
        category,
        metric,
      },
    });
  } catch (error: unknown) {
    logger.error('Error getting top streams:', error instanceof Error ? error : { error });
    throw error;
  }
}