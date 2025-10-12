import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { JWTUtils } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    // Refresh token'ı doğrula
    const payload = JWTUtils.verifyRefreshToken(refreshToken);

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true, backupCodes: true, isBanned: true, isVerified: true }
    });
    
    // Kullanıcı veya token kaydı yoksa
    if (!user || !(user.backupCodes || []).includes(`REFRESH:${refreshToken}`)) {
      throw createError('Invalid refresh token', 401);
    }

    // Ban kontrolü
    if (user.isBanned) {
      throw createError('Account has been suspended', 403);
    }

    // Yeni access token oluştur
    const jwtUser = {
      _id: user.id,
      username: user.username,
      email: user.email,
      role: (user as unknown as { role?: string }).role ?? 'user',
    };
    const newAccessToken = JWTUtils.generateAccessToken(jwtUser);
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh failed', { error });
    throw error;
  }
}