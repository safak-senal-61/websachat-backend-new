import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function getFollowers(req: AuthRequest, res: Response): Promise<void> {
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

    const skip = (page - 1) * Number(limit);

    const baseWhere: Prisma.FollowWhereInput = {
      followingId: userId,
      isBlocked: false,
    };

    const search = typeof searchParam === 'string' ? searchParam : undefined;
    const finalWhere: Prisma.FollowWhereInput = search
      ? {
        ...baseWhere,
        follower: {
          OR: [
            { username: { contains: String(search), mode: 'insensitive' } },
            { displayName: { contains: String(search), mode: 'insensitive' } },
          ],
        },
      }
      : baseWhere;

    const [items, total] = await Promise.all([
      prisma.follow.findMany({
        where: finalWhere,
        include: { follower: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.follow.count({ where: finalWhere }),
    ]);

    res.json({
      success: true,
      data: {
        followers: items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, message: 'Takipçiler getirilirken hata oluştu' });
  }
}