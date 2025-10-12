import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function moderateStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { action, userId: targetUserId, reason, duration } = req.body;
    const moderatorId = req.user?.id;

    // JSON moderation alanı için tip
    interface LiveStreamModeration {
      isMuted?: boolean;
      mutedUntil?: Date | string | null;
      bannedUsers?: string[];
      moderators?: string[];
    }

    const stream = await prisma.liveStream.findUnique({ where: { id } });
    if (!stream) {
      throw createError('Stream not found', 404);
    }

    const moderation = (stream.moderation ?? {}) as LiveStreamModeration;
    const mods: string[] = Array.isArray(moderation.moderators) ? moderation.moderators : [];
    const isStreamer = stream.streamerId === moderatorId;
    const isModerator = moderatorId ? mods.includes(moderatorId) : false;
    const isAdmin = ['admin', 'moderator'].includes(req.user?.role || '');

    if (!isStreamer && !isModerator && !isAdmin) {
      throw createError('You do not have permission to moderate this stream', 403);
    }


    const updatedModeration: LiveStreamModeration = { ...moderation };
    switch (action) {
    case 'mute':
      updatedModeration.isMuted = true;
      if (duration) {
        const until = new Date(Date.now() + Number(duration) * 60 * 60 * 1000);
        // Date yerine ISO string
        updatedModeration.mutedUntil = until.toISOString();
      }
      break;

    case 'unmute':
      updatedModeration.isMuted = false;
      updatedModeration.mutedUntil = null;
      break;

    case 'ban_user': {
      const banned: string[] = Array.isArray(updatedModeration.bannedUsers) ? updatedModeration.bannedUsers : [];
      if (targetUserId && !banned.includes(targetUserId)) {
        updatedModeration.bannedUsers = [...banned, targetUserId];
      }
      break;
    }

    case 'unban_user': {
      const banned: string[] = Array.isArray(updatedModeration.bannedUsers) ? updatedModeration.bannedUsers : [];
      if (targetUserId) {
        updatedModeration.bannedUsers = banned.filter((uid) => uid !== targetUserId);
      }
      break;
    }

    case 'add_moderator':
      if (targetUserId && !mods.includes(targetUserId)) {
        updatedModeration.moderators = [...mods, targetUserId];
      }
      break;

    case 'remove_moderator':
      if (targetUserId) {
        updatedModeration.moderators = mods.filter((uid) => uid !== targetUserId);
      }
      break;

    case 'end_stream':
      if (stream.status === 'LIVE') {
        // moderation alanını JSON’a normalleştir
        const moderationJson: Prisma.InputJsonValue = {
          isMuted: updatedModeration.isMuted ?? false,
          mutedUntil: updatedModeration.mutedUntil ?? null,
          bannedUsers: Array.isArray(updatedModeration.bannedUsers) ? updatedModeration.bannedUsers : [],
          moderators: Array.isArray(updatedModeration.moderators) ? updatedModeration.moderators : [],
        };

        await prisma.liveStream.update({
          where: { id },
          data: { status: 'ENDED', endedAt: new Date(), moderation: moderationJson },
        });
      }
      break;

    default:
      throw createError('Invalid moderation action', 400);
    }

    // action !== 'end_stream' için moderation alanını JSON’a normalleştir
    const moderationJson: Prisma.InputJsonValue = {
      isMuted: updatedModeration.isMuted ?? false,
      mutedUntil: updatedModeration.mutedUntil ?? null,
      bannedUsers: Array.isArray(updatedModeration.bannedUsers) ? updatedModeration.bannedUsers : [],
      moderators: Array.isArray(updatedModeration.moderators) ? updatedModeration.moderators : [],
    };

    const updated =
      action === 'end_stream'
        ? await prisma.liveStream.findUnique({ where: { id }, select: { id: true, moderation: true, status: true } })
        : await prisma.liveStream.update({
          where: { id },
          data: { moderation: moderationJson },
          select: { id: true, moderation: true, status: true },
        });

    logger.info(`Stream ${id} moderated by ${moderatorId}: ${action}`, { reason, targetUserId });

    res.json({
      success: true,
      message: `Stream ${String(action).replace('_', ' ')} successful`,
      data: { stream: updated },
    });
  } catch (error: unknown) {
    logger.error('Error moderating stream:', error instanceof Error ? error : { error });
    throw error;
  }
}