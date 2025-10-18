import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { JWTUtils } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import bcrypt from 'bcrypt';

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
    // Token üretimi için Prisma user'ı IUser’a uyarlıyoruz
    const jwtUser = {
      _id: user.id,
      username: user.username,
      email: user.email,
      role: (user as unknown as { role?: string }).role ? String((user as unknown as { role?: string }).role).toLowerCase() : 'user',
    };

    const { accessToken, refreshToken } = JWTUtils.generateTokenPair(jwtUser);

    // Refresh token'ı kalıcı olarak tutmak istenirse backupCodes içinde sakla
    let backupCodes = user.backupCodes || [];
    if (rememberMe) {
      backupCodes = [...backupCodes, `REFRESH:${refreshToken}`];
    }

    // Son giriş zamanını güncelle ve backupCodes'u kaydet
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        backupCodes,
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