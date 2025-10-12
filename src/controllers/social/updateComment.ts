import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function updateComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const commentIdParam = req.params?.commentId;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!commentIdParam || typeof commentIdParam !== 'string') {
      res.status(400).json({ success: false, message: 'Geçersiz yorum ID' });
      return;
    }

    if (!userId || typeof userId !== 'string') {
      res.status(401).json({ success: false, message: 'Kimlik doğrulama gerekli' });
      return;
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentIdParam } });
    if (!comment) {
      res.status(404).json({ success: false, message: 'Yorum bulunamadı' });
      return;
    }

    if (comment.authorId !== userId) {
      res.status(403).json({ success: false, message: 'Bu yorumu düzenleme yetkiniz yok' });
      return;
    }

    if (comment.isDeleted) {
      res.status(400).json({ success: false, message: 'Silinmiş yorumlar düzenlenemez' });
      return;
    }

    const previousHistory = Array.isArray(comment.editHistory) ? (comment.editHistory as unknown[]) : [];
    const newEntry = { editorId: userId, content, editedAt: new Date().toISOString() };
    const updatedHistory = [...previousHistory, newEntry];
    const updatedHistoryArray = updatedHistory as unknown as Prisma.InputJsonValue[];

    const updated = await prisma.comment.update({
      where: { id: commentIdParam },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
        // JSON liste alanı: { set: [...] }
        editHistory: { set: updatedHistoryArray },
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      },
    });

    res.json({
      success: true,
      message: 'Yorum başarıyla güncellendi',
      data: updated,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ success: false, message: 'Yorum güncellenirken hata oluştu' });
  }
}