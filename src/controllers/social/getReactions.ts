import { Response, Request } from 'express';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function getReactions(req: Request, res: Response): Promise<void> {
  try {
    const targetIdParam = req.params?.targetId;
    const targetTypeParam = req.params?.targetType;

    const targetId =
      typeof targetIdParam === 'string' && targetIdParam.trim().length > 0 ? targetIdParam : undefined;
    const targetType =
      typeof targetTypeParam === 'string' && targetTypeParam.trim().length > 0 ? targetTypeParam : undefined;

    // Sorgu parametrelerini güvenli şekilde parse et
    const q = req.query as Record<string, unknown>;
    const pageParam = Array.isArray(q.page) ? q.page[0] : q.page;
    const limitParam = Array.isArray(q.limit) ? q.limit[0] : q.limit;
    const reactionTypeParam = Array.isArray(q.reactionType) ? q.reactionType[0] : q.reactionType;
    const startDateParam = Array.isArray(q.startDate) ? q.startDate[0] : q.startDate;
    const endDateParam = Array.isArray(q.endDate) ? q.endDate[0] : q.endDate;

    const page = Math.max(1, Number(pageParam) || 1);
    const limitRaw = Number(limitParam) || 50;
    const limit = Math.min(100, Math.max(1, limitRaw));

    if (!targetId || !targetType) {
      res.status(400).json({ success: false, message: 'Geçersiz hedef bilgileri' });
      return;
    }

    const skip = (page - 1) * limit;

    const where: Prisma.ReactionWhereInput = { targetId, targetType };

    if (reactionTypeParam) {
      where.reactionType = String(reactionTypeParam);
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

    const [items, total] = await Promise.all([
      prisma.reaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.reaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        reactions: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ success: false, message: 'Tepkiler getirilirken hata oluştu' });
  }
}