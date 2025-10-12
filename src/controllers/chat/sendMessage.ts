import { Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import type { AuthRequest } from '@/middleware/auth';
import type { $Enums } from '@/generated/prisma';
import type { Prisma } from '@/generated/prisma';

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  // Helper to safely extract status and message from unknown errors
  const getErrorInfo = (err: unknown): { status: number; message: string } => {
    if (typeof err === 'object' && err !== null) {
      const maybe = err as { statusCode?: unknown; message?: unknown };
      const status = typeof maybe.statusCode === 'number' ? maybe.statusCode : 500;
      const message = typeof maybe.message === 'string' ? maybe.message : 'Failed to send message';
      return { status, message };
    }
    return { status: 500, message: 'Failed to send message' };
  };

  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('Authentication required', 401);
    }

    const { streamId, content, type = 'TEXT', metadata } = req.body as {
      streamId: string;
      content: string;
      type?: keyof typeof $Enums.CommentType | 'TEXT' | 'EMOJI' | 'STICKER' | 'GIF';
      metadata?: Prisma.InputJsonValue;
    };

    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        streamerId: true,
        status: true,
        settings: true,
      },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    // Safely read settings JSON
    const settingsRoot = stream.settings;
    let allowComments = true;
    let requireFollowToChat = false;
    if (settingsRoot && typeof settingsRoot === 'object' && !Array.isArray(settingsRoot)) {
      const s = settingsRoot as Record<string, unknown>;
      const ac = s.allowComments;
      if (typeof ac === 'boolean') allowComments = ac;
      const rf = s.requireFollowToChat;
      if (typeof rf === 'boolean') requireFollowToChat = rf;
    }

    if (!allowComments) {
      throw createError('Comments are disabled for this stream', 403);
    }

    if (requireFollowToChat) {
      const isFollowing = await prisma.follow.findFirst({
        where: { followerId: userId, followingId: stream.streamerId },
        select: { id: true },
      });
      if (!isFollowing) {
        throw createError('You must follow the streamer to chat', 403);
      }
    }

    const data: {
      authorId: string;
      streamId: string;
      content: string;
      type: $Enums.CommentType;
      metadata?: Prisma.InputJsonValue;
      reactions: Prisma.InputJsonValue;
      userReactions: Prisma.InputJsonValue;
      moderation: Prisma.InputJsonValue;
      engagement: Prisma.InputJsonValue;
      editHistory: Prisma.InputJsonValue[]; // FIX: Json[] bekleniyor
    } = {
      authorId: userId,
      streamId,
      content,
      type: type as $Enums.CommentType,
      reactions: {} as Prisma.InputJsonValue,
      userReactions: {} as Prisma.InputJsonValue,
      moderation: {} as Prisma.InputJsonValue,
      engagement: {} as Prisma.InputJsonValue,
      editHistory: [] as Prisma.InputJsonValue[], // FIX: liste olarak veriyoruz
    };
    if (metadata !== undefined) {
      data.metadata = metadata;
    }

    const created = await prisma.comment.create({ data });

    logger.info(`Chat message created in stream ${streamId} by ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: created,
      },
    });
  } catch (error: unknown) {
    logger.error('sendMessage error:', error);
    const { status, message } = getErrorInfo(error);
    res.status(status).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
}