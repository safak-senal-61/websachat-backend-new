import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma, Comment } from '../../generated/prisma';

export async function moderateComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const commentIdParam = req.params?.commentId;
    const actionRaw = req.body?.action;
    const reasonRaw = req.body?.reason;
    const userId = req.user?.id;

    // Parametre doğrulaması
    if (typeof userId !== 'string' || !userId.trim()) {
      res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
      return;
    }
    if (typeof commentIdParam !== 'string' || !commentIdParam.trim()) {
      res.status(400).json({ success: false, message: 'commentId zorunludur' });
      return;
    }
    const commentId = commentIdParam.trim();

    const allowedActions = new Set(['pin', 'unpin', 'hide', 'unhide', 'delete', 'approve', 'flag']);
    const action = typeof actionRaw === 'string' ? actionRaw : '';
    if (!allowedActions.has(action)) {
      res.status(400).json({ success: false, message: 'Geçersiz moderasyon eylemi' });
      return;
    }
    const reason = typeof reasonRaw === 'string' && reasonRaw.trim() ? reasonRaw.trim() : null;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ success: false, message: 'Yorum bulunamadı' });
      return;
    }

    let updated: Comment | null = null;
    switch (action) {
    case 'pin':
      updated = await prisma.comment.update({
        where: { id: commentId },
        data: { isPinned: true, pinnedAt: new Date(), pinnedById: userId },
      });
      break;
    case 'unpin':
      updated = await prisma.comment.update({
        where: { id: commentId },
        data: { isPinned: false, pinnedAt: null, pinnedById: null },
      });
      break;
    case 'hide':
      updated = await prisma.comment.update({
        where: { id: commentId },
        data: { isHidden: true, hiddenAt: new Date(), hiddenById: userId, hiddenReason: reason },
      });
      break;
    case 'unhide':
      updated = await prisma.comment.update({
        where: { id: commentId },
        data: { isHidden: false, hiddenAt: null, hiddenById: null, hiddenReason: null },
      });
      break;
    case 'delete':
      updated = await prisma.comment.update({
        where: { id: commentId },
        data: { isDeleted: true, deletedAt: new Date(), deletedById: userId, deletionReason: reason },
      });
      break;
    case 'approve': {
      const prev = comment.moderation;
      const base =
        typeof prev === 'object' && prev !== null && !Array.isArray(prev)
          ? (prev as Record<string, unknown>)
          : {};
      const moderation: Prisma.InputJsonObject = {
        ...base,
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
      };
      updated = await prisma.comment.update({
        where: { id: commentId },
        data: { moderation },
      });
      break;
    }
    case 'flag': {
      const prev = comment.moderation;
      const base =
        typeof prev === 'object' && prev !== null && !Array.isArray(prev)
          ? (prev as Record<string, unknown>)
          : {};
      const moderation: Prisma.InputJsonObject = {
        ...base,
        isFlagged: true,
        flaggedBy: userId,
        flaggedAt: new Date().toISOString(),
        flagReason: reason,
      };
      updated = await prisma.comment.update({
        where: { id: commentId },
        data: { moderation },
      });
      break;
    }
    default:
      // Beklenmedik bir eylem durumunda güvenli geri dönüş
      updated = null;
    }

    if (!updated) {
      res.status(500).json({ success: false, message: 'Moderasyon güncellemesi uygulanamadı' });
      return;
    }

    res.json({
      success: true,
      message: 'Moderasyon eylemi başarıyla uygulandı',
      data: updated,
    });
  } catch (error) {
    console.error('Moderate comment error:', error);
    res.status(500).json({ success: false, message: 'Moderasyon eylemi uygulanırken hata oluştu' });
  }
}