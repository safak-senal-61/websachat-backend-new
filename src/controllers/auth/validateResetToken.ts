import { Request, Response } from 'express';
import { prisma } from '../../config/database';

type LoginHistoryEntry = { type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'PWD_RESET'; token: string; expiresAt: string };

export async function validateResetToken(req: Request, res: Response): Promise<void> {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

    if (!token) {
      res.status(400).json({ valid: false, message: 'Geçersiz istek: token bulunamadı.' });
      return;
    }

    // Her iki formatı destekle: 'PWD_RESET:<token>' ve 'PASSWORD_RESET:<token>'
    const matchEntries = [`PWD_RESET:${token}`, `PASSWORD_RESET:${token}`];

    // backupCodes is Json in dev SQLite; fetch candidates and filter client-side
    const candidates = await prisma.user.findMany({
      select: { id: true, email: true, username: true, displayName: true, loginHistory: true, backupCodes: true }
    });
    const user = candidates.find((u) => Array.isArray(u.backupCodes)
      ? (u.backupCodes as unknown as unknown[]).some((v) => typeof v === 'string' && matchEntries.includes(v))
      : false);

    if (!user) {
      res.status(400).json({ valid: false, message: 'Token geçersiz veya süresi dolmuş.' });
      return;
    }

    const histories: LoginHistoryEntry[] = Array.isArray(user.loginHistory)
      ? (user.loginHistory as LoginHistoryEntry[])
      : [];

    const record = histories.find(
      h => (h.type === 'PWD_RESET' || h.type === 'PASSWORD_RESET') && h.token === token
    );

    const isValid = !!(record && record.expiresAt && new Date(record.expiresAt).getTime() > Date.now());

    if (!isValid) {
      res.status(400).json({ valid: false, message: 'Token geçersiz veya süresi dolmuş.' });
      return;
    }

    res.json({
      valid: true,
      message: 'Token geçerli.',
      data: {
        expiresAt: record?.expiresAt ?? '',
        user: {
          username: user.username,
          displayName: user.displayName || user.username,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Token doğrulama sırasında hata oluştu.' });
  }
}