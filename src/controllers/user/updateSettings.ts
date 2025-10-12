import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: userIdParam } = req.params;
    if (!userIdParam) {
      throw createError('User ID is required', 400);
    }
    const currentUserId = req.user?.id;

    // Check if user is updating their own settings
    if (currentUserId !== userIdParam) {
      throw createError('You can only update your own settings', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdParam },
      select: {
        notificationSettings: true,
        isPrivate: true,
        allowDirectMessages: true,
        showOnlineStatus: true,
        showLastSeen: true,
      },
    });
    if (!user) {
      throw createError('User not found', 404);
    }

    const { privacy, notifications } = req.body as {
      privacy?: {
        isPrivate?: boolean;
        allowDirectMessages?: boolean;
        showOnlineStatus?: boolean;
        showLastSeen?: boolean;
      };
      notifications?: Record<string, unknown>;
    };

    const privacyUpdates: Record<string, boolean> = {};
    if (privacy) {
      if (privacy.isPrivate !== undefined) privacyUpdates.isPrivate = !!privacy.isPrivate;
      if (privacy.allowDirectMessages !== undefined)
        privacyUpdates.allowDirectMessages = !!privacy.allowDirectMessages;
      if (privacy.showOnlineStatus !== undefined)
        privacyUpdates.showOnlineStatus = !!privacy.showOnlineStatus;
      if (privacy.showLastSeen !== undefined) privacyUpdates.showLastSeen = !!privacy.showLastSeen;
    }

    const currentNotif =
      typeof user.notificationSettings === 'object' && user.notificationSettings !== null
        ? (user.notificationSettings as Record<string, unknown>)
        : {};
    const incomingNotif =
      notifications && typeof notifications === 'object' && notifications !== null
        ? (notifications as Record<string, unknown>)
        : undefined;

    const mergedNotificationsObj =
      incomingNotif !== undefined ? { ...currentNotif, ...incomingNotif } : currentNotif;
    const mergedNotifications: Prisma.InputJsonValue =
      mergedNotificationsObj as unknown as Prisma.InputJsonValue;

    const updated = await prisma.user.update({
      where: { id: userIdParam },
      data: {
        ...(Object.keys(privacyUpdates).length ? privacyUpdates : {}),
        notificationSettings: mergedNotifications,
      },
      select: {
        id: true,
        isPrivate: true,
        allowDirectMessages: true,
        showOnlineStatus: true,
        showLastSeen: true,
        notificationSettings: true,
      },
    });

    logger.info('User settings updated', { userId: updated.id });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: {
          privacy: {
            isPrivate: updated.isPrivate,
            allowDirectMessages: updated.allowDirectMessages,
            showOnlineStatus: updated.showOnlineStatus,
            showLastSeen: updated.showLastSeen,
          },
          notifications: updated.notificationSettings ?? {},
        },
      },
    });
  } catch (error) {
    logger.error('Update settings failed', { error, userId: req.params.id });
    throw error;
  }
}