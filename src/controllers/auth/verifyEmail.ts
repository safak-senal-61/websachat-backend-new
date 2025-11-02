import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import type { Prisma } from '../../generated/prisma';

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      throw createError('Verification token is required', 400);
    }

    const entry = `EMAIL_VERIFY:${token}`;

    // Token'ı backupCodes içinde arayın (SQLite dev: backupCodes is Json)
    const candidates = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        isVerified: true,
        backupCodes: true,
        loginHistory: true,
      },
    });
    const user = candidates.find((u) => Array.isArray(u.backupCodes)
      ? (u.backupCodes as unknown as unknown[]).some((v) => typeof v === 'string' && v === entry)
      : false);

    if (!user) {
      throw createError('Invalid or expired verification token', 400);
    }

    // loginHistory içinden token detayını ve süresini kontrol edin
    type LoginHistoryEntry = { type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'PWD_RESET'; token: string; expiresAt: string };
    const histories: LoginHistoryEntry[] = Array.isArray(user.loginHistory)
      ? (user.loginHistory as LoginHistoryEntry[])
      : [];
    const record = histories.find((h) => h.type === 'EMAIL_VERIFY' && h.token === token);
    const isValid = !!(record && record.expiresAt && new Date(record.expiresAt).getTime() > Date.now());

    if (!isValid) {
      throw createError('Invalid or expired verification token', 400);
    }

    // Token ve history kayıtlarını temizleyin
    const existingCodes: string[] = Array.isArray(user.backupCodes)
      ? (user.backupCodes as unknown as unknown[]).filter((v) => typeof v === 'string') as string[]
      : [];
    const cleanedCodes = existingCodes.filter((c) => c !== entry);
    const cleanedHistory = histories.filter((h) => !(h.type === 'EMAIL_VERIFY' && h.token === token));

    // Kullanıcı doğrulamasını güncelleyin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        backupCodes: cleanedCodes, // was: cast to InputJsonValue
        loginHistory: cleanedHistory as unknown as Prisma.InputJsonValue[], // was: single InputJsonValue
      },
      select: { id: true, isVerified: true, email: true, displayName: true, username: true },
    });

    // Hoş geldin e-postası gönder
    try {
      await emailService.sendWelcomeEmail(
        updatedUser.email,
        updatedUser.displayName || updatedUser.username
      );
    } catch (emailError) {
      logger.error('Failed to send welcome email', { error: emailError, userId: updatedUser.id });
    }

    logger.info('Email verified successfully', { userId: updatedUser.id, email: updatedUser.email });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: updatedUser.id,
          isVerified: updatedUser.isVerified,
        },
      },
    });
  } catch (error) {
    logger.error('Email verification failed', { error, token: req.body.token });
    throw error;
  }
}