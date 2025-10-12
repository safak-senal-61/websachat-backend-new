import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function reportComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    const reporterId = req.user?.id;

    if (typeof commentId !== 'string' || !commentId.trim()) {
      res.status(400).json({ success: false, message: 'Geçersiz yorum kimliği' });
      return;
    }
    if (typeof reporterId !== 'string' || !reporterId.trim()) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }

    const safeCommentId: string = commentId;
    const safeReason: string | null = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
    const safeDescription: string | null = typeof description === 'string' && description.trim() ? description.trim() : null;

    const comment = await prisma.comment.findUnique({
      where: { id: safeCommentId },
      select: { id: true, reports: true, reportCount: true },
    });
    if (!comment) {
      res.status(404).json({ success: false, message: 'Yorum bulunamadı' });
      return;
    }

    const newReport = {
      reporterId,
      reason: safeReason,
      description: safeDescription,
      createdAt: new Date().toISOString(),
    };

    const updatedReports = Array.isArray(comment.reports) ? [...(comment.reports as unknown[]), newReport] : [newReport];
    const updatedReportsArray = updatedReports as unknown as Prisma.InputJsonValue[];

    await prisma.comment.update({
      where: { id: safeCommentId },
      data: {
        // JSON liste alanları için { set: [...] } kullanın
        reports: { set: updatedReportsArray },
        reportCount: (comment.reportCount ?? 0) + 1,
      },
      select: { id: true },
    });

    res.json({ success: true, message: 'Yorum başarıyla şikayet edildi' });
  } catch (error) {
    console.error('Report comment error:', error);
    res.status(500).json({ success: false, message: 'Yorum şikayet edilirken hata oluştu' });
  }
}