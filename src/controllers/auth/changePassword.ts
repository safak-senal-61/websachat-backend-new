// imports for changePassword
import { Response } from 'express';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../../middleware/auth';

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Mevcut şifreyi doğrula
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw createError('Current password is incorrect', 400);
    }

    // Yeni şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Şifreyi güncelle ve REFRESH tokenlarını backupCodes içinden temizle
    const existingCodes: string[] = Array.isArray(user.backupCodes)
      ? (user.backupCodes as unknown as unknown[]).filter((v) => typeof v === 'string') as string[]
      : [];
    const filteredBackupCodes = existingCodes.filter((code) => !String(code).startsWith('REFRESH:'));
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        backupCodes: filteredBackupCodes, // was: cast to InputJsonValue
      },
    });

    // Onay e-postası gönder
    try {
      await emailService.sendPasswordChangeConfirmation(user.email, user.displayName || user.username);
    } catch (emailError) {
      logger.error('Failed to send password change confirmation', { error: emailError, userId: user.id });
    }

    logger.info('Password changed successfully', { userId: user.id });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Password change failed', { error, userId: req.user?.id });
    throw error;
  }
}