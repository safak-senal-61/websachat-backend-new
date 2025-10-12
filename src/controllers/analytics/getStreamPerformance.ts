import { Request, Response } from 'express';
import { prisma } from '../../config/database';

interface StreamStats {
  totalDuration?: number;
  totalViewers?: number;
  peakViewers?: number;
  currentViewers?: number;
  totalComments?: number;
  totalLikes?: number;
}

interface PerformancePayload {
  stream: {
    _id: string;
    title: string | null;
    streamer: unknown;
    category: unknown;
    startTime: Date;
    endTime: Date | null;
    duration: number;
  };
  metrics: {
    totalViewers: number;
    peakViewers: number;
    averageViewers: number;
    totalWatchTime: number;
    engagementRate: number;
    retentionRate: number;
    bounceRate: number;
  };
  engagement?: {
    comments: number;
    gifts: number;
    giftsValue: number;
    reactions: number;
  };
  audience?: {
    uniqueViewers: number;
    returningViewers: number;
    newViewers: number;
    averageSessionDuration: number;
  };
  comparisons?: {
    viewersChange: number;
    viewersChangePercent: number;
  };
}

export async function getStreamPerformance(req: Request, res: Response): Promise<Response> {
  try {
    const { streamId } = req.params as { streamId: string };
    const { includeComparisons = false, includeBreakdown = true, includeAudience = true } = req.query as Partial<{
      includeComparisons: boolean | string;
      includeBreakdown: boolean | string;
      includeAudience: boolean | string;
    }>;

    const stream = await prisma.liveStream.findUnique({
      where: { id: String(streamId) },
      include: {
        streamer: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found' });
    }

    const stats = (stream.stats as StreamStats) || {};
    const safeNum = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

    const performance: PerformancePayload = {
      stream: {
        _id: stream.id,
        title: stream.title,
        streamer: stream.streamer,
        category: stream.category, // enum
        startTime: (stream.startedAt || stream.createdAt) as Date,
        endTime: stream.endedAt,
        duration: safeNum(stats.totalDuration),
      },
      metrics: {
        totalViewers: safeNum(stats.totalViewers),
        peakViewers: safeNum(stats.peakViewers),
        averageViewers: safeNum(stats.currentViewers),
        totalWatchTime: safeNum(stats.totalDuration),
        engagementRate:
          (safeNum(stats.totalComments) + safeNum(stats.totalLikes)) / Math.max(safeNum(stats.totalViewers), 1),
        retentionRate: 0.75,
        bounceRate: 0.25,
      },
    };

    const isBreakdown = String(includeBreakdown).toLowerCase() === 'true' || includeBreakdown === true;
    if (isBreakdown) {
      const [commentsCount, gifts] = await Promise.all([
        prisma.comment.count({ where: { streamId: stream.id } }),
        prisma.gift.findMany({ where: { streamId: stream.id }, select: { value: true, quantity: true } }),
      ]);

      const giftsCount = gifts.length;
      const giftsValue = gifts.reduce((sum, g) => sum + (g.value || 0) * Math.max(g.quantity || 1, 1), 0);

      performance.engagement = {
        comments: commentsCount,
        gifts: giftsCount,
        giftsValue,
        reactions: 0, // Prisma'da Reaction modeli yok
      };
    }

    const isAudience = String(includeAudience).toLowerCase() === 'true' || includeAudience === true;
    if (isAudience) {
      performance.audience = {
        uniqueViewers: safeNum(stats.totalViewers),
        returningViewers: 0,
        newViewers: safeNum(stats.totalViewers),
        averageSessionDuration: safeNum(stats.totalDuration),
      };
    }

    const isComparisons = String(includeComparisons).toLowerCase() === 'true' || includeComparisons === true;
    if (isComparisons && stream.streamerId) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const previousStreams = await prisma.liveStream.findMany({
        where: {
          streamerId: stream.streamerId,
          id: { not: stream.id },
          createdAt: { gte: since },
        },
        select: { stats: true },
        take: 10,
      });

      if (previousStreams.length > 0) {
        const avgPreviousViewers =
          previousStreams.reduce((sum, s) => sum + safeNum((s.stats as StreamStats)?.currentViewers), 0) /
          previousStreams.length;

        performance.comparisons = {
          viewersChange: safeNum(stats.currentViewers) - avgPreviousViewers,
          viewersChangePercent:
            avgPreviousViewers > 0 ? ((safeNum(stats.currentViewers) - avgPreviousViewers) / avgPreviousViewers) * 100 : 0,
        };
      }
    }

    return res.json({ success: true, message: 'Stream performance retrieved successfully', data: performance });
  } catch (error: unknown) {
    console.error('Get stream performance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stream performance' });
  }
}