// imports for endStream
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export async function endStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    // id paramını kesin string olarak al
    const { id } = req.params as { id: string };
    const userId = req.user?.id;

    const stream = await prisma.liveStream.findUnique({ where: { id } });
    if (!stream) {
      throw createError('Stream not found', 404);
    }

    const isPrivileged = ['admin', 'moderator'].includes(req.user?.role || '');
    if (stream.streamerId !== userId && !isPrivileged) {
      throw createError('You do not have permission to end this stream', 403);
    }

    if (stream.status !== 'LIVE') {
      throw createError('Stream is not currently live', 400);
    }

    const now = new Date();
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
    const stats: StreamStats =
      stream.stats && typeof stream.stats === 'object' ? (stream.stats as StreamStats) : {};
    const updatedStats: StreamStats = {
      ...stats,
      currentViewers: 0,
    };
    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        status: 'ENDED',
        endedAt: now,
        stats: updatedStats,
      },
      select: { id: true, status: true, endedAt: true, stats: true },
    });

    logger.info(`Stream ended: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Stream ended successfully',
      data: { stream: updated },
    });
  } catch (error: unknown) {
    logger.error('Error ending stream:', error);
    throw error;
  }
}