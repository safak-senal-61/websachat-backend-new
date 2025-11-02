import { Request, Response } from 'express';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';
import crypto from 'crypto';
import type { Prisma } from '../../generated/prisma';

// Basit süre parse helper: '30m', '1h', '10m', '2d' -> ms
// function parseExpiresToMs
function parseExpiresToMs(value: string | number | undefined, fallbackMs: number): number {
  if (value === undefined || value === null) return fallbackMs;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // sayısal verilirse saniye kabul edip ms'e çevir
    return Math.max(0, value) * 1000;
  }
  const s = String(value).trim().toLowerCase();
  const match = s.match(/^(\d+)\s*(ms|s|m|h|d)?$/);
  if (!match) return fallbackMs;

  const numStr = match[1] ?? '';
  if (!numStr) return fallbackMs;

  const num = parseInt(numStr, 10);
  if (Number.isNaN(num) || num < 0) return fallbackMs;

  const unitRaw = match[2];
  const unit = unitRaw ?? 'm'; // unit yoksa dakika varsay

  switch (unit) {
  case 'ms': return num;
  case 's': return num * 1000;
  case 'm': return num * 60 * 1000;
  case 'h': return num * 60 * 60 * 1000;
  case 'd': return num * 24 * 60 * 60 * 1000;
  default: return fallbackMs;
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isVerified: true,
        backupCodes: true,
        loginHistory: true,
      },
    });

    // Her durumda aynı mesajı döndür (email var/yok belli olmasın)
    if (!user) {
      res.json({
        success: true,
        message: 'If an account with that email exists and is verified, a password reset link has been sent.',
      });
      return;
    }

    // 🔒 GÜVENLİK KONTROLÜ: Email doğrulanmamış kullanıcılar şifre sıfırlayamaz
    if (!user.isVerified) {
      logger.warn('Password reset attempted for unverified email', { 
        userId: user.id, 
        email: user.email 
      });
      
      // Güvenlik için aynı mesajı döndür (email doğrulanmamış olduğu belli olmasın)
      res.json({
        success: true,
        message: 'If an account with that email exists and is verified, a password reset link has been sent.',
      });
      return;
    }

    // Reset token üret ve geçerlilik süresi ayarla (ENV: PASSWORD_RESET_EXPIRES_IN, default 30m)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresMs = parseExpiresToMs(process.env.PASSWORD_RESET_EXPIRES_IN, 30 * 60 * 1000);
    const expires = new Date(Date.now() + expiresMs);

    // Kullanıcıya tokenı backupCodes ve loginHistory içine yaz (SQLite dev: Json type)
    const existingCodes: string[] = Array.isArray(user.backupCodes)
      ? (user.backupCodes as unknown as unknown[]).filter((v) => typeof v === 'string') as string[]
      : [];
    const backupCodes = [...existingCodes, `PASSWORD_RESET:${resetToken}`];
    type LoginHistoryEntry = { type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'PWD_RESET'; token: string; expiresAt: string };
    const existingHistory: LoginHistoryEntry[] = Array.isArray(user.loginHistory)
      ? (user.loginHistory as LoginHistoryEntry[])
      : [];
    const loginHistory: LoginHistoryEntry[] = [
      ...existingHistory,
      { type: 'PASSWORD_RESET', token: resetToken, expiresAt: expires.toISOString() }
    ];
    await prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes: backupCodes, // was: cast to InputJsonValue
        loginHistory: loginHistory as unknown as Prisma.InputJsonValue[], // was: single InputJsonValue
      },
    });

    // Eposta gönder
    await emailService.sendPasswordResetEmail(user.email, user.displayName || user.username, resetToken);

    logger.info('Password reset email sent', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'If an account with that email exists and is verified, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Forgot password failed', { error, email: req.body.email });
    throw error;
  }
}