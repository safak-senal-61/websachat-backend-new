import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import path from 'path';
import fs from 'fs';

interface MulterRequest extends AuthRequest {
  file?: Express.Multer.File;
}

export const uploadAvatar = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw createError('Authentication required', 401);
    }

    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    // Dosya URL'sini oluştur
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Kullanıcının mevcut avatar'ını al
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });

    // Eski avatar dosyasını sil (eğer varsa ve uploads klasöründeyse)
    if (existingUser?.avatar && existingUser.avatar.startsWith('/uploads/')) {
      const oldAvatarPath = path.join(process.cwd(), existingUser.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Veritabanında avatar URL'sini güncelle
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        createdAt: true
      }
    });

    logger.info('User avatar uploaded', { userId: updatedUser.id });

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: updatedUser,
        avatarUrl: avatarUrl
      }
    });

  } catch (error) {
    logger.error('Upload avatar error:', error);
    throw error;
  }
};