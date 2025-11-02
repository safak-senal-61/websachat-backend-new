import { Request, Response } from 'express';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import bcrypt from 'bcrypt';
import type { Prisma } from '../../generated/prisma';

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body;

    // Hem yeni hem eski formatı destekle: 'PWD_RESET:<token>' ve 'PASSWORD_RESET:<token>'
    const matchEntries = [`PWD_RESET:${token}`, `PASSWORD_RESET:${token}`];

    // backupCodes is Json in dev SQLite; fetch candidates and filter client-side
    const candidates = await prisma.user.findMany({
      select: { id: true, email: true, username: true, displayName: true, backupCodes: true, loginHistory: true }
    });
    const user = candidates.find((u) => Array.isArray(u.backupCodes)
      ? (u.backupCodes as unknown as unknown[]).some((v) => typeof v === 'string' && matchEntries.includes(v))
      : false);

    if (!user) {
      throw createError('Invalid or expired reset token', 400);
    }

    // loginHistory içinde token detaylarını bul ve süresini kontrol et
    type LoginHistoryEntry = { type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'PWD_RESET'; token: string; expiresAt: string };
    const histories: LoginHistoryEntry[] = Array.isArray(user.loginHistory)
      ? (user.loginHistory as LoginHistoryEntry[])
      : [];

    // Her iki tip için kontrol et
    const record = histories.find(
      h => (h.type === 'PWD_RESET' || h.type === 'PASSWORD_RESET') && h.token === token
    );
    const isValid = !!(record && record.expiresAt && new Date(record.expiresAt).getTime() > Date.now());

    if (!isValid) {
      throw createError('Invalid or expired reset token', 400);
    }

    // Yeni şifreyi hashle ve kaydet
    const hashedPassword = await bcrypt.hash(password, 12);

    // backupCodes'tan reset tokenlarını ve tüm REFRESH tokenlarını temizle (Json to string[])
    const existingCodes: string[] = Array.isArray(user.backupCodes)
      ? (user.backupCodes as unknown as unknown[]).filter((v) => typeof v === 'string') as string[]
      : [];
    const cleanedBackupCodes = existingCodes
      .filter((code) => !matchEntries.includes(code))     // her iki formatı sil
      .filter((code) => !code.startsWith('REFRESH:'));    // tüm refresh tokenları sil

    // loginHistory'den bu reset kayıtlarını temizle (her iki type için)
    const cleanedHistory = histories.filter(
      h => !((h.type === 'PWD_RESET' || h.type === 'PASSWORD_RESET') && h.token === token)
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        backupCodes: cleanedBackupCodes, // was: cast to InputJsonValue
        loginHistory: cleanedHistory as unknown as Prisma.InputJsonValue[], // was: single InputJsonValue
      }
    });

    // Onay e-postası gönder
    try {
      await emailService.sendPasswordChangeConfirmation(user.email, user.displayName || user.username);
    } catch (emailError) {
      logger.error('Failed to send password change confirmation', { error: emailError, userId: user.id });
    }

    logger.info('Password reset successfully', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Password reset failed', { error, token: req.body.token });
    throw error;
  }
}