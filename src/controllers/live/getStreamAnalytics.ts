// imports for getStreamAnalytics
import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export async function getStreamAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    // id paramını kesin string olarak al
    const { id } = req.params as { id: string };
    const { period = 'daily', metrics = ['viewers'] } = req.query as {
      period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
      metrics?: string[];
    };
    const userId = req.user?.id;

    const stream = await prisma.liveStream.findUnique({ where: { id } });
    if (!stream) {
      throw createError('Stream not found', 404);
    }

    const isPrivileged = ['admin', 'moderator'].includes(req.user?.role || '');
    if (stream.streamerId !== userId && !isPrivileged) {
      throw createError('You can only view analytics for your own streams', 403);
    }

    type StreamStats = {
      totalViewers?: number;
      peakViewers?: number;
      currentViewers?: number;
      totalDuration?: number;
      totalComments?: number;
      totalGifts?: number;
      totalLikes?: number;
      revenue?: number;
    };
    type TechnicalInfo = {
      quality?: string[];
      bitrate?: number;
      fps?: number;
      resolution?: string;
      serverRegion?: string;
    };
    const stats: StreamStats =
      stream.stats && typeof stream.stats === 'object' ? (stream.stats as StreamStats) : {};
    const technical: TechnicalInfo =
      stream.technical && typeof stream.technical === 'object' ? (stream.technical as TechnicalInfo) : {};
    const analytics = {
      overview: {
        totalViewers: stats.totalViewers || 0,
        peakViewers: stats.peakViewers || 0,
        currentViewers: stats.currentViewers || 0,
        totalDuration: stats.totalDuration || 0,
        totalComments: stats.totalComments || 0,
        totalGifts: stats.totalGifts || 0,
        totalLikes: stats.totalLikes || 0,
        revenue: stats.revenue || 0,
      },
      engagement: {
        averageViewTime:
          (stats.totalDuration || 0) > 0
            ? (stats.totalDuration || 0) / Math.max(stats.totalViewers || 0, 1)
            : 0,
        chatActivity: (stats.totalComments || 0) / Math.max(stats.totalViewers || 0, 1),
        giftRate: (stats.totalGifts || 0) / Math.max(stats.totalViewers || 0, 1),
        likeRate: (stats.totalLikes || 0) / Math.max(stats.totalViewers || 0, 1),
      },
      technical: {
        quality: technical.quality,
        bitrate: technical.bitrate,
        fps: technical.fps,
        resolution: technical.resolution,
        serverRegion: technical.serverRegion,
      },
    };

    res.json({
      success: true,
      data: {
        analytics,
        period,
        metrics,
      },
    });
  } catch (error: unknown) {
    logger.error('Error getting stream analytics:', error instanceof Error ? error : { error });
    throw error;
  }
}