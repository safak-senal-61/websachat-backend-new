import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const commentIdParam = req.params?.commentId;
    const commentId =
      typeof commentIdParam === 'string' && commentIdParam.trim().length > 0 ? commentIdParam : undefined;

    const userIdParam = req.user?.id;
    const userId = typeof userIdParam === 'string' && userIdParam.trim().length > 0 ? userIdParam : undefined;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }

    if (!commentId) {
      res.status(400).json({ success: false, message: 'Geçersiz yorum ID' });
      return;
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ success: false, message: 'Yorum bulunamadı' });
      return;
    }

    const isAuthor = comment.authorId === userId;

    let isStreamer = false;
    if (!isAuthor) {
      const stream = await prisma.liveStream.findUnique({ where: { id: comment.streamId } });
      isStreamer = !!stream && stream.streamerId === userId;
    }

    if (!isAuthor && !isStreamer) {
      res.status(403).json({ success: false, message: 'Bu yorumu silme yetkiniz yok' });
      return;
    }

    await prisma.comment.delete({ where: { id: commentId } });

    res.json({ success: true, message: 'Yorum başarıyla silindi' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Yorum silinirken hata oluştu' });
  }
}