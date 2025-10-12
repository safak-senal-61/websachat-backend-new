// updateUserRole (admin)
import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';
import { Role } from '@/generated/prisma';

function toRoleEnum(role: string): Role {
  switch (role.toLowerCase()) {
  case 'user': return Role.USER;
  case 'streamer': return Role.STREAMER;
  case 'moderator': return Role.MODERATOR;
  case 'admin': return Role.ADMIN;
  default: throw createError('Invalid role', 400);
  }
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.id);
  const roleInput = String(req.body.role ?? '');
  const roleEnum = toRoleEnum(roleInput);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw createError('User not found', 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: roleEnum },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      isBanned: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    message: 'User role updated successfully',
    data: { user: updated },
  });
}