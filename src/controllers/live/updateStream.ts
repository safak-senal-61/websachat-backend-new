import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';
export async function updateStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.id;

    

    const stream = await prisma.liveStream.findUnique({ where: { id } });
    if (!stream) {
      throw createError('Stream not found', 404);
    }

    const isPrivileged = ['admin', 'moderator'].includes(req.user?.role || '');
    if (stream.streamerId !== userId && !isPrivileged) {
      throw createError('You do not have permission to update this stream', 403);
    }

    // any yerine Prisma.LiveStreamUpdateInput
    const data: Prisma.LiveStreamUpdateInput = {} as Prisma.LiveStreamUpdateInput;

    if (typeof req.body.title !== 'undefined') data.title = req.body.title;
    if (typeof req.body.description !== 'undefined') data.description = req.body.description;
    if (typeof req.body.thumbnail !== 'undefined') data.thumbnail = req.body.thumbnail;

    if (typeof req.body.category !== 'undefined') {
      const upper = String(req.body.category).toUpperCase();
      data.category = upper as $Enums.StreamCategory;
    }
    if (typeof req.body.visibility !== 'undefined') {
      const upper = String(req.body.visibility).toUpperCase();
      data.visibility = upper as $Enums.StreamVisibility;
    }
    if (Array.isArray(req.body.tags)) {
      data.tags = req.body.tags as string[];
    }

    // JSON alanlarını tipli merge edip InputJsonValue olarak aktar
    if (typeof req.body.settings !== 'undefined') {
      const merged = {
        ...(stream.settings as unknown as Record<string, unknown>),
        ...((req.body.settings as Record<string, unknown>) || {}),
      } as Prisma.InputJsonValue;
      data.settings = merged;
    }
    if (typeof req.body.technical !== 'undefined') {
      const merged = {
        ...(stream.technical as unknown as Record<string, unknown>),
        ...((req.body.technical as Record<string, unknown>) || {}),
      } as Prisma.InputJsonValue;
      data.technical = merged;
    }
    if (typeof req.body.moderation !== 'undefined') {
      const merged = {
        ...(stream.moderation as unknown as Record<string, unknown>),
        ...((req.body.moderation as Record<string, unknown>) || {}),
      } as Prisma.InputJsonValue;
      data.moderation = merged;
    }
    if (typeof req.body.metadata !== 'undefined') {
      const merged = {
        ...(stream.metadata as unknown as Record<string, unknown>),
        ...((req.body.metadata as Record<string, unknown>) || {}),
      } as Prisma.InputJsonValue;
      data.metadata = merged;
    }
    if (typeof req.body.monetization !== 'undefined') {
      const merged = {
        ...(stream.monetization as unknown as Record<string, unknown>),
        ...((req.body.monetization as Record<string, unknown>) || {}),
      } as Prisma.InputJsonValue;
      data.monetization = merged;
    }

    // Zaman damgaları ve status
    if (typeof req.body.scheduledAt !== 'undefined') {
      data.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
    }
    if (typeof req.body.startedAt !== 'undefined') {
      data.startedAt = req.body.startedAt ? new Date(req.body.startedAt) : null;
    }
    if (typeof req.body.endedAt !== 'undefined') {
      data.endedAt = req.body.endedAt ? new Date(req.body.endedAt) : null;
    }
    if (typeof req.body.status !== 'undefined') {
      const upper = String(req.body.status).toUpperCase();
      data.status = upper as $Enums.StreamStatus;
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data,
      include: {
        streamer: { select: { username: true, displayName: true, avatar: true, isVerified: true } },
      },
    });

    logger.info(`Stream updated: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Stream updated successfully',
      data: { stream: updated },
    });
  } catch (error: unknown) {
    logger.error('Error updating stream:', error instanceof Error ? error : { error });
    throw error;
  }
}