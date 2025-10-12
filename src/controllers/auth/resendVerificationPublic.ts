import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';

export async function resendVerificationPublic(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      throw createError('Email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, displayName: true, isVerified: true, backupCodes: true, loginHistory: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    if (user.isVerified) {
      throw createError('Email is already verified', 400);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const backupCodes = [...(user.backupCodes || []), `EMAIL_VERIFY:${verificationToken}`];
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
      data: { backupCodes, loginHistory }
    });

    await emailService.sendVerificationEmail(user.email, user.displayName || user.username, verificationToken);

    logger.info('Verification email resent (public)', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    logger.error('Failed to resend verification email (public)', { error, email: req.body?.email });
    throw error;
  }
}