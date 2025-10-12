import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export async function reportStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { reason, description, timestamp } = req.body;
    const reporterId = req.user?.id;

    if (!reporterId) {
      throw createError('Authentication required', 401);
    }

    // JSON moderation alanı için tip
    interface LiveStreamModeration {
      isMuted?: boolean;
      mutedUntil?: string | null;
      bannedUsers?: string[];
      moderators?: string[];
      reportCount?: number;
      isReported?: boolean;
    }

    const stream = await prisma.liveStream.findUnique({ where: { id } });
    if (!stream) {
      throw createError('Stream not found', 404);
    }

    // any yerine tipli kullanım
    const moderation = (stream.moderation ?? {}) as LiveStreamModeration;
    const reportCount = (moderation.reportCount ?? 0) + 1;

    await prisma.liveStream.update({
      where: { id },
      data: { moderation: { ...moderation, reportCount, isReported: true } },
    });

    logger.warn(`Stream reported: ${id}`, {
      reporterId,
      reason,
      description,
      timestamp,
      streamTitle: stream.title,
      streamerId: stream.streamerId,
    });

    res.json({
      success: true,
      message: 'Stream reported successfully. Our moderation team will review it.',
    });
  } catch (error: unknown) {
    logger.error('Error reporting stream:', error instanceof Error ? error : { error });
    throw error;
  }
}