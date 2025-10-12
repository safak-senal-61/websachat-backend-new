import { Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import type { AuthRequest } from '@/middleware/auth';
import type { $Enums } from '@/generated/prisma';

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { streamId } = req.params;
    if (!streamId) {
      throw createError('Stream ID is required', 400);
    }

    const { page = 1, limit = 50, sortBy = 'newest', type, includeDeleted = false } = (req.query ?? {}) as {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'oldest';
      type?: keyof typeof $Enums.CommentType | 'TEXT' | 'EMOJI' | 'STICKER' | 'GIF';
      includeDeleted?: boolean;
    };

    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { id: true },
    });
    if (!stream) {
      throw createError('Stream not found', 404);
    }

    const where = {
      streamId,
      parentCommentId: null, // sohbet mesajları üst yorum değil
      ...(includeDeleted ? {} : { isDeleted: false }),
      ...(type ? { type: type as $Enums.CommentType } : {}),
    };

    const orderBy = sortBy === 'oldest' ? { createdAt: 'asc' as const } : { createdAt: 'desc' as const };

    const [total, messages] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error: unknown) {
    logger.error('getMessages error:', error);
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode ?? 500
        : 500;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: string }).message ?? 'Failed to fetch messages'
        : 'Failed to fetch messages';

    res.status(status).json({
      success: false,
      message,
      error:
        process.env.NODE_ENV === 'development'
          ? (error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : undefined)
          : undefined,
    });
  }
}