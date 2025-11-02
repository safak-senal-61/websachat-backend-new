import { Response } from 'express';
import { prisma } from '@/config/database';
import { type AuthRequest } from '@/middleware/auth';

export const acceptAdminInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  const { token } = req.body as { token: string };
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const invite = await prisma.adminInvite.findUnique({ where: { token } });
  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite not found' });
    return;
  }
  if (invite.status !== 'PENDING') {
    res.status(400).json({ success: false, message: 'Invite is not pending' });
    return;
  }
  if (invite.expiresAt <= new Date()) {
    // Optionally mark expired
    await prisma.adminInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
    res.status(410).json({ success: false, message: 'Invite has expired' });
    return;
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ success: false, message: 'Invite does not match your email' });
    return;
  }

  // Promote user to admin
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });

  // Mark invite as accepted
  await prisma.adminInvite.update({
    where: { id: invite.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });

  res.status(200).json({
    success: true,
    message: 'Admin invite accepted; your role is now ADMIN',
    data: { role: 'ADMIN' },
  });
};