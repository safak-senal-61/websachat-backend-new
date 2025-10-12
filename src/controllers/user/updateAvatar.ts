import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';

export async function updateAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: userIdParam } = req.params;
    if (!userIdParam) {
      throw createError('User ID is required', 400);
    }
    const currentUserId = req.user?.id;

    // Check if user is updating their own avatar or is admin
    if (currentUserId !== userIdParam && req.user?.role !== 'admin') {
      throw createError('You can only update your own avatar', 403);
    }

    // In a real application, you would handle file upload here
    // For now, we'll accept an avatar URL
    const { avatar } = req.body;

    if (!avatar) {
      throw createError('Avatar URL is required', 400);
    }

    const updated = await prisma.user.update({
      where: { id: userIdParam },
      data: { avatar },
      select: { id: true, avatar: true, updatedAt: true },
    });

    logger.info('User avatar updated', { userId: updated.id, updatedBy: currentUserId });

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        user: {
          id: updated.id,
          avatar: updated.avatar,
          updatedAt: updated.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Update avatar failed', { error, userId: req.params.id });
    throw error;
  }
}