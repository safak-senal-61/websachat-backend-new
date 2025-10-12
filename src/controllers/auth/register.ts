import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { JWTUtils } from '../../utils/jwt';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Prisma } from '../../generated/prisma';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password, displayName, dateOfBirth, gender, country, city } = req.body;

    // Kullanıcı var mı kontrolü
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: (email || '').toLowerCase() },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === (email || '').toLowerCase()) {
        throw createError('Email already registered', 409);
      }
      if (existingUser.username === username) {
        throw createError('Username already taken', 409);
      }
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 12);

    // Doğrulama token'ı oluştur (24 saat geçerli)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // JSON alanlarını Prisma.InputJsonValue olarak hazırla
    const locationJson: Prisma.InputJsonValue = {
      country: country ?? null,
      city: city ?? null,
    };
    const loginHistoryJson: Prisma.InputJsonValue[] = [
      {
        type: 'EMAIL_VERIFY',
        token: verificationToken,
        expiresAt: verificationTokenExpires.toISOString(),
      },
    ];
    const statsJson: Prisma.InputJsonValue = {
      totalStreams: 0,
      totalWatchTime: 0,
    };

    // Yeni kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        username,
        email: (email || '').toLowerCase(),
        password: hashedPassword,
        displayName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        location: locationJson,
        backupCodes: [],
        loginHistory: loginHistoryJson,
        stats: statsJson,
      }
    });

    // Doğrulama e-postası gönder
    try {
      await emailService.sendVerificationEmail(user.email, user.displayName || user.username, verificationToken);
    } catch (emailError) {
      logger.error('Failed to send verification email', { error: emailError, userId: user.id });
      // E-posta başarısız olsa dahi kaydı tamamla
    }

    // Tokenları üret
    // Tokenları üretmeden önce Prisma user'ı IUser’a uyarlıyoruz
    const jwtUser = {
      _id: user.id,
      username: user.username,
      email: user.email,
      role: (user as unknown as { role?: string }).role ? String((user as unknown as { role?: string }).role).toLowerCase() : 'user',
    };

    const { accessToken, refreshToken } = JWTUtils.generateTokenPair(jwtUser);

    // Refresh token'ı sakla (kalıcı oturum için)
    const updatedBackupCodes = [...(user.backupCodes || []), `REFRESH:${refreshToken}`];
    await prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes: updatedBackupCodes
      }
    });

    logger.info('User registered successfully', { userId: user.id, username, email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error('Registration failed', { error, body: req.body });
    throw error;
  }
}