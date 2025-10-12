// removeReaction.ts içindeki removeReaction fonksiyonu
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export async function removeReaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const targetId = req.params?.targetId;
    const targetType = req.params?.targetType;

    // Parametre doğrulaması
    if (typeof userId !== 'string' || !userId.trim()) {
      res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
      return;
    }
    if (typeof targetId !== 'string' || !targetId.trim()) {
      res.status(400).json({ success: false, message: 'targetId zorunludur' });
      return;
    }
    if (typeof targetType !== 'string' || !targetType.trim()) {
      res.status(400).json({ success: false, message: 'targetType zorunludur' });
      return;
    }

    const compositeKey = { userId, targetId, targetType };

    // Prisma client kullanılabilir: any cast kaldırıldı
    const existing = await prisma.reaction.findUnique({
      where: { userId_targetId_targetType: compositeKey },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Tepki bulunamadı' });
      return;
    }

    await prisma.reaction.delete({
      where: { userId_targetId_targetType: compositeKey },
    });

    res.json({ success: true, message: 'Tepki başarıyla kaldırıldı' });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ success: false, message: 'Tepki kaldırılırken hata oluştu' });
  }
}