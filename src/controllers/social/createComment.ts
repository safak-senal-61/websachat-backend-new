import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';

export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const authorId = req.user?.id;
    if (!authorId) {
      res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
      return;
    }
    const authorIdStr: string = String(authorId);

    // Body'den değerleri güvenli şekilde al ve tiplerini normalize et
    const rawStreamId = req.body?.streamId;
    const rawContent = req.body?.content;
    const rawType = req.body?.type;
    const rawParentCommentId = req.body?.parentCommentId;
    const rawMetadata = req.body?.metadata;

    const streamId: string | undefined = typeof rawStreamId === 'string' ? rawStreamId : undefined;
    const content: string | undefined = typeof rawContent === 'string' ? rawContent : undefined;
    const parentCommentId: string | undefined =
      typeof rawParentCommentId === 'string' ? rawParentCommentId : undefined;

    // CommentType enum değerlerini normalize et
    const allowedTypes = ['TEXT', 'EMOJI', 'STICKER', 'GIF'] as const;
    type CommentTypeStr = (typeof allowedTypes)[number];
    const normalizedType: CommentTypeStr =
      typeof rawType === 'string' && allowedTypes.includes(rawType.toUpperCase() as CommentTypeStr)
        ? (rawType.toUpperCase() as CommentTypeStr)
        : 'TEXT';

    if (!streamId) {
      res.status(400).json({ success: false, message: 'Geçersiz yayın ID' });
      return;
    }
    if (!content) {
      res.status(400).json({ success: false, message: 'Yorum içeriği gerekli' });
      return;
    }

    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) {
      res.status(404).json({ success: false, message: 'Yayın bulunamadı' });
      return;
    }

    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentCommentId } });
      if (!parentComment) {
        res.status(404).json({ success: false, message: 'Üst yorum bulunamadı' });
        return;
      }
    }

    // JSON tipini güvence altına al
    const metadata: Prisma.InputJsonValue | undefined =
      rawMetadata && typeof rawMetadata === 'object' ? (rawMetadata as Prisma.InputJsonValue) : undefined;

    const initialUserReactions: Prisma.InputJsonObject = {};
    const initialReactions: Prisma.InputJsonObject = {};
    const initialModeration: Prisma.InputJsonObject = { isApproved: true };
    const initialEngagement: Prisma.InputJsonObject = { viewCount: 0, shareCount: 0, likeCount: 0 };
    const initialEditHistory: Prisma.InputJsonValue[] = [];
    const initialReports: Prisma.InputJsonValue[] = [];

    const data = {
      authorId: authorIdStr,
      streamId,
      content,
      type: normalizedType as $Enums.CommentType,
      parentCommentId: parentCommentId ?? null,
      userReactions: initialUserReactions,
      reactions: initialReactions,
      moderation: initialModeration,
      engagement: initialEngagement,
      editHistory: initialEditHistory,
      reports: initialReports,
      ...(metadata !== undefined ? { metadata } : {}),
    };

    const comment = await prisma.comment.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Yorum başarıyla oluşturuldu',
      data: comment,
    });
  } catch (error: unknown) {
    console.error('Create comment error:', error instanceof Error ? error : { error });
    res.status(500).json({ success: false, message: 'Yorum oluşturulurken hata oluştu' });
  }
}