// imports for getStreamById
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export async function getStreamById(req: AuthRequest, res: Response): Promise<void> {
  try {
    // id paramını kesin string olarak al
    const { id } = req.params as { id: string };
    const userId = req.user?.id;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
      include: {
        // followersCount alanı yok, seçimi geçerli alanlara indir
        streamer: { select: { username: true, displayName: true, avatar: true, isVerified: true } },
      },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    const isPrivileged = ['admin', 'moderator'].includes(req.user?.role || '');
    if (stream.visibility === 'PRIVATE' && stream.streamerId !== userId && !isPrivileged) {
      throw createError('You do not have permission to view this stream', 403);
    }

    type StreamStats = {
      currentViewers?: number;
      peakViewers?: number;
      totalViewers?: number;
      totalDuration?: number;
      totalComments?: number;
      totalGifts?: number;
      totalLikes?: number;
      revenue?: number;
    };
    type TechnicalInfo = {
      streamKey?: string;
      rtmpUrl?: string;
      serverRegion?: string;
      quality?: string[];
      bitrate?: number;
      fps?: number;
      resolution?: string;
    };
    let stats: StreamStats =
      stream.stats && typeof stream.stats === 'object' ? (stream.stats as StreamStats) : {};
    const technical: TechnicalInfo =
      stream.technical && typeof stream.technical === 'object' ? (stream.technical as TechnicalInfo) : {};
    if (stream.status === 'LIVE' && stream.streamerId !== userId) {
      const currentViewers = (stats.currentViewers || 0) + 1;
      const peakViewers = Math.max(stats.peakViewers || 0, currentViewers);
      const totalViewers = (stats.totalViewers || 0) + 1;
      stats = { ...stats, currentViewers, peakViewers, totalViewers };
      await prisma.liveStream.update({
        where: { id },
        data: { stats },
      });
    }
    const isOwner = stream.streamerId === userId;
    const streamData = {
      ...stream,
      technical: isOwner ? technical : { ...technical, streamKey: undefined },
    };
    res.json({
      success: true,
      data: { stream: streamData },
    });
  } catch (error: unknown) {
    logger.error('Error getting stream:', error instanceof Error ? error : { error });
    throw error;
  }
}