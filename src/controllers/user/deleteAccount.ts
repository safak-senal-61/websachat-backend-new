import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    if (!id) {
      throw createError('User id is required', 400);
    }

    // Check if user is deleting their own account or is admin
    if (currentUserId !== id && req.user?.role !== 'admin') {
      throw createError('You can only delete your own account', 403);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw createError('User not found', 404);
    }

    // In a real application, you might want to soft delete or anonymize data
    // For now, we'll just mark as deleted and anonymize unique fields
    const anonymizedUsername = `deleted_${id}`;
    const anonymizedEmail = `deleted_${id}@deleted.local`;

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        isActive: false,
        username: anonymizedUsername,
        email: anonymizedEmail,
        displayName: anonymizedUsername,
        avatar: null,
        bio: null,
        socialLinks: {}
      }
    });

    logger.info('User account deleted', {
      userId: id,
      deletedBy: currentUserId
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Delete account failed', { error, userId: req.params.id });
    throw error;
  }
}