import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

 // JSON istatistik alanı için tip
 interface LiveStreamStats {
   currentViewers?: number;
   peakViewers?: number;
   totalViewers?: number;
 }

export async function leaveStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.id;

    const stream = await prisma.liveStream.findUnique({ where: { id } });
    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.streamerId !== userId) {
      const stats = (stream.stats ?? {}) as LiveStreamStats;
      const currentViewers = Math.max((stats.currentViewers ?? 0) - 1, 0);
      await prisma.liveStream.update({
        where: { id },
        data: { stats: { ...stats, currentViewers } },
      });
    }

    logger.info(`User ${userId} left stream ${id}`);

    res.json({
      success: true,
      message: 'Left stream successfully',
    });
  } catch (error: unknown) {
    logger.error('Error leaving stream:', error instanceof Error ? error : { error });
    throw error;
  }
}