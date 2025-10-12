import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';

export async function toggleBlockUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: userIdParam } = req.params;
    if (!userIdParam) {
      throw createError('User ID is required', 400);
    }
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userIdParam },
      select: { id: true, username: true, isBanned: true },
    });
    if (!user) {
      throw createError('User not found', 404);
    }

    const nowBlocked = !user.isBanned;

    const updated = await prisma.user.update({
      where: { id: userIdParam },
      data: {
        isBanned: nowBlocked,
        // Optionally mark inactive when blocked; reactivate when unblocked
        isActive: nowBlocked ? false : true,
      },
      select: { id: true, username: true, isBanned: true },
    });

    const action = updated.isBanned ? 'blocked' : 'unblocked';
    logger.info(`User ${action}`, {
      userId: updated.id,
      username: updated.username,
      actionBy: req.user?.id,
      reason,
    });

    res.json({
      success: true,
      message: `User ${action} successfully`,
      data: {
        user: {
          id: updated.id,
          username: updated.username,
          // Keep response field name for compatibility
          isBlocked: updated.isBanned,
        },
      },
    });
  } catch (error) {
    logger.error('Toggle block user failed', { error, userId: req.params.id });
    throw error;
  }
}