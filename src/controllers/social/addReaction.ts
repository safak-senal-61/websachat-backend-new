import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export async function addReaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      targetId,
      targetType,
      reactionType,
      intensity = 3,
      position,
      customEmoji,
      isAnonymous = false,
      duration = 2000,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
      return;
    }

    let targetExists: unknown = null;
    switch (targetType) {
    case 'stream':
      targetExists = await prisma.liveStream.findUnique({ where: { id: targetId } });
      break;
    case 'comment':
      targetExists = await prisma.comment.findUnique({ where: { id: targetId } });
      break;
    case 'user':
      targetExists = await prisma.user.findUnique({ where: { id: targetId } });
      break;
    case 'gift':
      targetExists = await prisma.gift.findUnique({ where: { id: targetId } });
      break;
    default:
      targetExists = null;
    }

    if (!targetExists) {
      res.status(404).json({ success: false, message: 'Hedef bulunamadı' });
      return;
    }

    // JSON alanları için metadata'yı JSON uyumlu hale getir (Date -> ISO string)
    const metadata = {
      platform: 'web',
      userAgent: String(req.headers['user-agent'] || ''),
      timestamp: new Date().toISOString(),
    };

    const existing = await prisma.reaction.findUnique({
      where: { userId_targetId_targetType: { userId, targetId, targetType } },
    });

    if (existing) {
      const updated = await prisma.reaction.update({
        where: { userId_targetId_targetType: { userId, targetId, targetType } },
        data: {
          reactionType,
          intensity,
          position,
          customEmoji,
          isAnonymous,
          duration,
          metadata,
        },
      });
      res.json({ success: true, message: 'Tepki güncellendi', data: updated });
      return;
    }

    const reaction = await prisma.reaction.create({
      data: {
        userId,
        targetId,
        targetType,
        reactionType,
        intensity,
        position,
        customEmoji,
        isAnonymous,
        duration,
        metadata,
      },
    });

    res.status(201).json({ success: true, message: 'Tepki başarıyla eklendi', data: reaction });
  } catch (error: unknown) {
    console.error('Add reaction error:', error instanceof Error ? error : { error });
    res.status(500).json({ success: false, message: 'Tepki eklenirken hata oluştu' });
  }
}