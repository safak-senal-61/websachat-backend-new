import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';

export async function getRealtimeAnalytics(req: Request, res: Response): Promise<Response> {
  try {
    const { streamId, timeWindow = '5m' } = req.query as {
      streamId?: string;
      timeWindow?: '1m' | '5m' | '15m' | '30m' | '1h' | string;
    };

    const timeWindowMap: Record<'1m' | '5m' | '15m' | '30m' | '1h', number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
    };
    const tw = typeof timeWindow === 'string' && timeWindow in timeWindowMap
      ? (timeWindow as keyof typeof timeWindowMap)
      : '5m';
    const minutes = timeWindowMap[tw];
    const since = new Date(Date.now() - minutes * 60 * 1000);

    // Current viewers: LIVE durumundaki akışlar için toplam currentViewers
    const liveWhere: Prisma.LiveStreamWhereInput = {
      status: { equals: 'LIVE' as $Enums.StreamStatus },
      ...(streamId ? { id: String(streamId) } : {}),
    };

    const liveStreams = await prisma.liveStream.findMany({
      where: liveWhere,
      select: { stats: true },
    });

    const safeNum = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);
    interface LiveStreamStats {
      currentViewers?: number;
    }
    const currentViewers = liveStreams.reduce((sum, s) => {
      const stats: LiveStreamStats = (s.stats ?? {}) as LiveStreamStats;
      return sum + safeNum(stats.currentViewers);
    }, 0);

    // Chat activity: belirtilen zaman aralığında yorum sayısı
    const commentWhere: Prisma.CommentWhereInput = {
      createdAt: { gte: since },
      ...(streamId ? { streamId: String(streamId) } : {}),
    };
    const chatActivity = await prisma.comment.count({ where: commentWhere });

    // Gift activity: belirtilen zaman aralığında hediye sayısı
    const giftWhere: Prisma.GiftWhereInput = {
      createdAt: { gte: since },
      ...(streamId ? { streamId: String(streamId) } : {}),
    };
    const giftActivity = await prisma.gift.count({ where: giftWhere });

    // New followers: follow olaylarını say (streamId varsa streamer'a gelen takipler)
    let newFollowers = 0;
    if (streamId) {
      const stream = await prisma.liveStream.findUnique({
        where: { id: String(streamId) },
        select: { streamerId: true },
      });
      if (stream?.streamerId) {
        newFollowers = await prisma.follow.count({
          where: { followingId: stream.streamerId, createdAt: { gte: since } },
        });
      }
    } else {
      newFollowers = await prisma.follow.count({
        where: { createdAt: { gte: since } },
      });
    }

    const analytics = {
      currentViewers,
      chatActivity,
      giftActivity,
      newFollowers,
      timeWindow: tw,
      timestamp: new Date(),
    };

    return res.json({ success: true, message: 'Real-time analytics retrieved successfully', data: analytics });
  } catch (error: unknown) {
    console.error('Get real-time analytics error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve real-time analytics' });
  }
}