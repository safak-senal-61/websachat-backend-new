// imports for resendVerification
import { Response } from 'express';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import crypto from 'crypto';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma } from '../../generated/prisma';

export async function resendVerification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, displayName: true, isVerified: true, backupCodes: true, loginHistory: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    if (user.isVerified) {
      throw createError('Email is already verified', 400);
    }

    // Yeni doğrulama tokenı üret (24 saat)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // backupCodes ve loginHistory'yi güncelle (SQLite dev: Json type)
    const existingCodes: string[] = Array.isArray(user.backupCodes)
      ? (user.backupCodes as unknown as unknown[]).filter((v) => typeof v === 'string') as string[]
      : [];
    const backupCodes: string[] = [...existingCodes, `EMAIL_VERIFY:${verificationToken}`];

    type LoginHistoryEntry = { type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'PWD_RESET'; token: string; expiresAt: string };
    const existingHistory: LoginHistoryEntry[] = Array.isArray(user.loginHistory)
      ? (user.loginHistory as LoginHistoryEntry[])
      : [];
    const loginHistory: LoginHistoryEntry[] = [
      ...existingHistory,
      { type: 'EMAIL_VERIFY', token: verificationToken, expiresAt: expiresAt.toISOString() }
    ];

    await prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes, // FIX: pass string[] (matches string[] | UserUpdatebackupCodesInput)
        loginHistory: loginHistory as unknown as Prisma.InputJsonValue[], // FIX: pass array, not single InputJsonValue
      }
    });

    // Doğrulama e-postası gönder
    await emailService.sendVerificationEmail(user.email, user.displayName || user.username, verificationToken);

    logger.info('Verification email resent', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    logger.error('Failed to resend verification email', { error, userId: req.user?.id });
    throw error;
  }
}