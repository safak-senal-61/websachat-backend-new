// getUsers (admin)
import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { Role } from '@/generated/prisma';
import type { Prisma } from '@/generated/prisma';

function toRoleEnum(role?: string): Role | undefined {
  if (!role) return undefined;
  switch (role.toLowerCase()) {
  case 'user': return Role.USER;
  case 'streamer': return Role.STREAMER;
  case 'moderator': return Role.MODERATOR;
  case 'admin': return Role.ADMIN;
  default: return undefined;
  }
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const q = String(req.query.q ?? '').trim();
  const role = toRoleEnum(String(req.query.role ?? ''));
  const status = String(req.query.status ?? '').toLowerCase();
  const sort = String(req.query.sort ?? 'createdAt');
  const order = String(req.query.order ?? 'desc').toLowerCase();

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (status === 'active') where.isActive = true;
  else if (status === 'inactive') where.isActive = false;
  else if (status === 'banned') where.isBanned = true;

  const orderKey: 'createdAt' | 'username' | 'email' =
    (sort === 'username' || sort === 'email') ? sort : 'createdAt';
  const orderDir: Prisma.SortOrder = order === 'asc' ? 'asc' : 'desc';
  const orderBy: Prisma.UserOrderByWithRelationInput = { [orderKey]: orderDir };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        isBanned: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      users,
    },
  });
}