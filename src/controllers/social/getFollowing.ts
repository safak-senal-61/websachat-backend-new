import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function getFollowing(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userIdParam = req.params?.userId;
    const userId = typeof userIdParam === 'string' && userIdParam.trim().length > 0 ? userIdParam : undefined;
    if (!userId) {
      res.status(400).json({ success: false, message: 'Geçersiz kullanıcı ID' });
      return;
    }

    const q = req.query as Record<string, unknown>;
    const pageParam = Array.isArray(q.page) ? q.page[0] : q.page;
    const limitParam = Array.isArray(q.limit) ? q.limit[0] : q.limit;
    const searchParam = Array.isArray(q.search) ? q.search[0] : q.search;

    const page = Math.max(1, Number(pageParam) || 1);
    const limitRaw = Number(limitParam) || 20;
    const limit = Math.min(100, Math.max(1, limitRaw));

    const skip = (Number(page) - 1) * Number(limit);

    const baseWhere: Prisma.FollowWhereInput = {
      followerId: userId,
      isBlocked: false,
    };

    const search = typeof searchParam === 'string' ? searchParam : undefined;
    const where: Prisma.FollowWhereInput = search
      ? {
        ...baseWhere,
        following: {
          OR: [
            { username: { contains: String(search), mode: 'insensitive' } },
            { displayName: { contains: String(search), mode: 'insensitive' } },
          ],
        },
      }
      : baseWhere;

    const [items, total] = await Promise.all([
      prisma.follow.findMany({
        where,
        include: { following: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.follow.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        following: items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, message: 'Takip edilenler getirilirken hata oluştu' });
  }
}