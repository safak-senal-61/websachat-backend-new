import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { JWTUtils } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import bcrypt from 'bcrypt';
// Removed unused: import type { Prisma } from '../../generated/prisma'

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password, rememberMe } = req.body;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw createError('Invalid credentials', 401);
    }

    // Hesap durum kontrolleri
    if (user.isBanned) {
      throw createError('Account has been suspended', 403);
    }
    if (!user.isVerified) {
      throw createError('Please verify your email address before logging in', 401);
    }

    // Token üretimi
    // Role'ü tek yerde normalize et (lowercase)
    const roleLower =
      (user as unknown as { role?: string }).role
        ? String((user as unknown as { role?: string }).role).toLowerCase()
        : 'user';

    const jwtUser = {
      _id: user.id,
      username: user.username,
      email: user.email,
      role: roleLower,
    };

    const { accessToken, refreshToken } = JWTUtils.generateTokenPair(jwtUser);

    // Refresh token'ı kalıcı olarak tutmak istenirse backupCodes içinde sakla (SQLite dev: Json type)
    const existingBackupCodes: string[] = Array.isArray(user.backupCodes)
      ? (user.backupCodes as unknown as unknown[]).filter((v) => typeof v === 'string') as string[]
      : [];
    const updatedBackupCodes = rememberMe
      ? [...existingBackupCodes, `REFRESH:${refreshToken}`]
      : existingBackupCodes;

    // Son giriş zamanını güncelle ve backupCodes'u kaydet
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        backupCodes: updatedBackupCodes, // was: cast to InputJsonValue
      },
    });

    logger.info('User logged in successfully', { userId: user.id, username: user.username });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          isVerified: user.isVerified,
          lastLoginAt: user.lastLoginAt,
          role: roleLower,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error('Login failed', { error, identifier: req.body.identifier });
    throw error;
  }
}