import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import path from 'path';
import fs from 'fs';

export async function deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      throw createError('Authentication required', 401);
    }

    // Kullanıcının mevcut avatar'ını al
    const existingUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { avatar: true }
    });

    if (!existingUser?.avatar) {
      throw createError('No avatar to delete', 400);
    }

    // Avatar dosyasını sil (eğer uploads klasöründeyse)
    if (existingUser.avatar.startsWith('/uploads/')) {
      const avatarPath = path.join(process.cwd(), existingUser.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Veritabanında avatar'ı null yap
    const updated = await prisma.user.update({
      where: { id: currentUserId },
      data: { avatar: null },
      select: {
        id: true,
        avatar: true,
        displayName: true,
        updatedAt: true
      }
    });

    logger.info('User avatar deleted', { userId: updated.id });

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
      data: {
        user: updated
      }
    });
  } catch (error) {
    logger.error('Delete avatar failed', { error, userId: req.user?.id });
    throw error;
  }
}