import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function getGiftHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userIdParam = req.user?.id;
    const userId = typeof userIdParam === 'string' && userIdParam.trim().length > 0 ? userIdParam : undefined;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }

    const q = req.query as Record<string, unknown>;

    const typeParam = Array.isArray(q.type) ? q.type[0] : q.type;
    const type = typeof typeParam === 'string' ? typeParam.toLowerCase() : 'all';

    const pageParam = Array.isArray(q.page) ? q.page[0] : q.page;
    const limitParam = Array.isArray(q.limit) ? q.limit[0] : q.limit;
    const giftTypeParam = Array.isArray(q.giftType) ? q.giftType[0] : q.giftType;
    const startDateParam = Array.isArray(q.startDate) ? q.startDate[0] : q.startDate;
    const endDateParam = Array.isArray(q.endDate) ? q.endDate[0] : q.endDate;

    const page = Math.max(1, Number(pageParam) || 1);
    const limitRaw = Number(limitParam) || 20;
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const where: Prisma.GiftWhereInput = {};

    if (type === 'sent') {
      where.senderId = userId;
    } else if (type === 'received') {
      where.receiverId = userId;
    } else {
      where.OR = [{ senderId: userId }, { receiverId: userId }];
    }

    if (giftTypeParam) {
      const giftTypeStr = String(giftTypeParam);
      where.giftType = giftTypeStr; // schema.prisma'da giftType String, any gerekli değil
    }

    if (startDateParam || endDateParam) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDateParam) {
        const sd = new Date(String(startDateParam));
        if (!isNaN(sd.getTime())) createdAt.gte = sd;
      }
      if (endDateParam) {
        const ed = new Date(String(endDateParam));
        if (!isNaN(ed.getTime())) createdAt.lte = ed;
      }
      if (createdAt.gte || createdAt.lte) {
        where.createdAt = createdAt;
      }
    }

    const [gifts, total] = await Promise.all([
      prisma.gift.findMany({
        where,
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
          receiver: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
          stream: { select: { id: true, title: true, streamerId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.gift.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        gifts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get gift history error:', error);
    res.status(500).json({ success: false, message: 'Hediye geçmişi getirilirken hata oluştu' });
  }
}