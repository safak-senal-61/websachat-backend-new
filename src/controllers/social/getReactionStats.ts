// getReactionStats.ts dosyasındaki export async function getReactionStats() bloğu
import { Response, Request } from 'express';
import { prisma } from '../../config/database';

export async function getReactionStats(req: Request, res: Response): Promise<void> {
  try {
    const { targetId, targetType } = req.params;

    if (!targetId || !targetType) {
      res.status(400).json({ success: false, message: 'targetId ve targetType zorunludur' });
      return;
    }

    // Prisma client tiplerinde reaction delegesi mevcut, any cast gerekmez
    const stats = await prisma.reaction.groupBy({
      by: ['reactionType'],
      where: { targetId, targetType },
      _count: { _all: true },
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get reaction stats error:', error);
    res.status(500).json({ success: false, message: 'Tepki istatistikleri getirilirken hata oluştu' });
  }
}