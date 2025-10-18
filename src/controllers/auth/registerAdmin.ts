import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { JWTUtils } from '../../utils/jwt';
import { emailService } from '../../services/emailService';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Prisma } from '../../generated/prisma';
import { Role } from '../../generated/prisma';

export async function registerAdmin(req: Request, res: Response): Promise<void> {
  try {
    const configuredSecret = String(process.env.ADMIN_REGISTER_SECRET ?? '').trim();
    const inputSecret = String(req.body?.adminSecret ?? '').trim();

    if (!configuredSecret) {
      throw createError('Admin registration is not enabled', 503);
    }
    if (!inputSecret || inputSecret !== configuredSecret) {
      throw createError('Invalid admin secret', 403);
    }

    const { username, email, password, displayName, dateOfBirth, gender, country, city } = req.body;

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

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
        role: Role.ADMIN,
      }
    });

    try {
      await emailService.sendVerificationEmail(user.email, user.displayName || user.username, verificationToken);
    } catch (emailError) {
      logger.error('Failed to send verification email', { error: emailError, userId: user.id });
    }

    const jwtUser = {
      _id: user.id,
      username: user.username,
      email: user.email,
      role: String(user.role ?? 'ADMIN').toLowerCase(),
    };

    const { accessToken, refreshToken } = JWTUtils.generateTokenPair(jwtUser);

    const updatedBackupCodes = [...(user.backupCodes || []), `REFRESH:${refreshToken}`];
    await prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes: updatedBackupCodes
      }
    });

    logger.info('Admin user registered successfully', { userId: user.id, username, email });

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully. Please check your email for verification.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          role: 'admin',
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error('Admin registration failed', { error, body: req.body });
    throw error;
  }
}