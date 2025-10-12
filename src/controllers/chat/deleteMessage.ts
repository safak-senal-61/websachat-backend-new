import { Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import type { AuthRequest } from '@/middleware/auth';

export async function deleteMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const role = req.user?.role ?? 'user';
    if (!userId) {
      throw createError('Authentication required', 401);
    }

    const { messageId } = req.params as { messageId?: string };
    if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
      throw createError('Message ID is required', 400);
    }
    const msgId = messageId;
    const { reason } = (req.body ?? {}) as { reason?: string };

    const message = await prisma.comment.findUnique({
      where: { id: msgId },
      select: { id: true, authorId: true, isDeleted: true },
    });
    if (!message) {
      throw createError('Message not found', 404);
    }
    if (message.isDeleted) {
      res.status(200).json({
        success: true,
        message: 'Message already deleted',
      });
      return;
    }

    const isOwner = message.authorId === userId;
    const isModerator = role === 'moderator' || role === 'admin';
    if (!isOwner && !isModerator) {
      throw createError('Insufficient permissions', 403);
    }

    const data: {
      isDeleted: true;
      deletedAt: Date;
      deletedById: string;
      deletionReason?: string;
    } = {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: userId,
    };
    if (reason) {
      data.deletionReason = reason;
    }

    await prisma.comment.update({
      where: { id: msgId },
      data,
    });

    logger.info(`Message ${msgId} deleted by ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: unknown) {
    logger.error('deleteMessage error:', error);
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode ?? 500
        : 500;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: string }).message ?? 'Failed to delete message'
        : 'Failed to delete message';

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