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

  // Build DB where without text search to avoid unsupported 'mode'
  const whereDB: Prisma.UserWhereInput = {};
  if (role) whereDB.role = role;
  if (status === 'active') whereDB.isActive = true;
  else if (status === 'inactive') whereDB.isActive = false;
  else if (status === 'banned') whereDB.isBanned = true;

  const orderKey: 'createdAt' | 'username' | 'email' =
    (sort === 'username' || sort === 'email') ? sort : 'createdAt';
  const orderDir: Prisma.SortOrder = order === 'asc' ? 'asc' : 'desc';
  const orderBy: Prisma.UserOrderByWithRelationInput = { [orderKey]: orderDir };

  const baseUsers = await prisma.user.findMany({
    where: whereDB,
    orderBy,
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
  });

  // Case-insensitive q filtering in-memory
  const qLower = q.toLowerCase();
  const filtered = q
    ? baseUsers.filter((u) => {
      const uname = (u.username ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const dname = (u.displayName ?? '').toLowerCase();
      return uname.includes(qLower) || email.includes(qLower) || dname.includes(qLower);
    })
    : baseUsers;

  const total = filtered.length;
  const start = (page - 1) * limit;
  const users = filtered.slice(start, start + limit);

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