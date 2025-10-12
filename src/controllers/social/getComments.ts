import type { Response, Request } from 'express';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function getComments(req: Request, res: Response): Promise<void> {
  try {
    const streamIdParam = req.params?.streamId;
    const streamId = typeof streamIdParam === 'string' && streamIdParam.trim().length > 0 ? streamIdParam : undefined;

    // Sorgu parametrelerini güvenli şekilde parse et
    const q = req.query as Record<string, unknown>;
    const pageParam = Array.isArray(q.page) ? q.page[0] : q.page;
    const limitParam = Array.isArray(q.limit) ? q.limit[0] : q.limit;
    const sortByParam = Array.isArray(q.sortBy) ? q.sortBy[0] : q.sortBy;
    const includeRepliesParam = Array.isArray(q.includeReplies) ? q.includeReplies[0] : q.includeReplies;

    const page = Math.max(1, Number(pageParam) || 1);
    const limitRaw = Number(limitParam) || 50;
    const limit = Math.min(100, Math.max(1, limitRaw));

    const sortBy = String(sortByParam ?? 'newest').toLowerCase();

    const includeReplies =
      typeof includeRepliesParam === 'boolean'
        ? includeRepliesParam
        : typeof includeRepliesParam === 'string'
          ? includeRepliesParam.toLowerCase() !== 'false'
          : true;

    if (!streamId) {
      res.status(400).json({ success: false, message: 'Geçersiz stream ID' });
      return;
    }

    const skip = (page - 1) * limit;

    // Filtreyi Prisma tipiyle belirt
    const where: Prisma.CommentWhereInput = {
      streamId,
      isDeleted: false,
      isHidden: false,
    };

    // SortOrder değerlerini Prisma tipine sabitle
    const sortDesc: Prisma.SortOrder = 'desc';
    const sortAsc: Prisma.SortOrder = 'asc';

    // orderBy her zaman dizi ve Prisma tipine uygun
    const orderBy: Prisma.CommentOrderByWithRelationInput[] =
      sortBy === 'popular'
        ? [{ replyCount: sortDesc }, { createdAt: sortDesc }]
        : [{ createdAt: sortBy === 'oldest' ? sortAsc : sortDesc }];

    const include = includeReplies
      ? {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
        replies: true,
      }
      : {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      };

    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy,
        include,
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        comments: items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Yorumlar getirilirken hata oluştu' });
  }
}