import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@/config/database';
import { emailService } from '@/services/emailService';
import { logger } from '@/utils/logger';
import { type AuthRequest } from '@/middleware/auth';

export const createAdminInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body as { email: string }; // unused `role` kaldırıldı

  const inviter = req.user;
  if (!inviter) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // Prevent duplicate active invites
  const existing = await prisma.adminInvite.findFirst({
    where: {
      email: email.toLowerCase(),
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  if (existing) {
    res.status(409).json({ success: false, message: 'Active invite already exists for this email' });
    return;
  }

  const expiresHours = parseInt(process.env.ADMIN_INVITE_EXPIRES_HOURS || '48');
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

  const invite = await prisma.adminInvite.create({
    data: {
      email: email.toLowerCase(),
      token,
      createdById: inviter.id,
      role: 'ADMIN',
      status: 'PENDING',
      expiresAt,
    },
  });

  try {
    await emailService.sendAdminInviteEmail(email, inviter.displayName || inviter.username || 'Bir Admin', token, expiresHours);
  } catch (e) {
    logger.error('Failed to send admin invite email', { error: e });
    // Still return created; email delivery failure can be retried
  }

  res.status(201).json({
    success: true,
    message: 'Admin invite created successfully',
    data: {
      id: invite.id,
      email: invite.email,
      status: invite.status,
      expiresAt: invite.expiresAt,
    },
  });
};