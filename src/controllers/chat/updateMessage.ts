import { Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import type { AuthRequest } from '@/middleware/auth';
import type { Prisma } from '@/generated/prisma';

export async function updateMessage(req: AuthRequest, res: Response): Promise<void> {
  // Helper to safely extract status and message from unknown errors
  const getErrorInfo = (err: unknown): { status: number; message: string } => {
    if (typeof err === 'object' && err !== null) {
      const maybe = err as { statusCode?: unknown; message?: unknown };
      const status = typeof maybe.statusCode === 'number' ? maybe.statusCode : 500;
      const message = typeof maybe.message === 'string' ? maybe.message : 'Failed to update message';
      return { status, message };
    }
    return { status: 500, message: 'Failed to update message' };
  };

  try {
    const userId = req.user?.id;
    const role = req.user?.role ?? 'user';
    if (!userId) {
      throw createError('Authentication required', 401);
    }

    const { messageId } = req.params;
    if (!messageId) {
      throw createError('Message ID is required', 400);
    }
    const msgId: string = messageId;

    const { content, metadata } = req.body as { content: string; metadata?: Prisma.InputJsonValue };

    const message = await prisma.comment.findUnique({
      where: { id: msgId },
      select: { id: true, authorId: true, content: true, editHistory: true, isDeleted: true },
    });
    if (!message) {
      throw createError('Message not found', 404);
    }
    if (message.isDeleted) {
      throw createError('Cannot edit a deleted message', 400);
    }

    const isOwner = message.authorId === userId;
    const isModerator = role === 'moderator' || role === 'admin';
    if (!isOwner && !isModerator) {
      throw createError('Insufficient permissions', 403);
    }

    // Safely normalize edit history array
    const isEditRecord = (
      r: unknown,
    ): r is { previousContent: string; editedAt: string; editorId: string } => {
      if (typeof r !== 'object' || r === null) return false;
      const obj = r as Record<string, unknown>;
      return (
        typeof obj.previousContent === 'string' &&
        typeof obj.editedAt === 'string' &&
        typeof obj.editorId === 'string'
      );
    };
    const historyArray = Array.isArray(message.editHistory)
      ? (message.editHistory as unknown[]).filter(isEditRecord)
      : [];

    const newRecord = {
      previousContent: message.content,
      editedAt: new Date().toISOString(),
      editorId: userId,
    };
    const nextHistory = [...historyArray, newRecord];

    const data: {
      content: string;
      isEdited: true;
      editedAt: Date;
      editHistory: Prisma.InputJsonValue[]; // was: InputJsonValue
      metadata?: Prisma.InputJsonValue;
    } = {
      content,
      isEdited: true,
      editedAt: new Date(),
      editHistory: nextHistory as unknown as Prisma.InputJsonValue[], // was: single InputJsonValue
    };
    if (metadata !== undefined) {
      data.metadata = metadata;
    }

    const updated = await prisma.comment.update({
      where: { id: msgId },
      data,
    });

    logger.info(`Message ${msgId} updated by ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: { message: updated },
    });
  } catch (error: unknown) {
    logger.error('updateMessage error:', error);
    const { status, message } = getErrorInfo(error);
    res.status(status).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
}