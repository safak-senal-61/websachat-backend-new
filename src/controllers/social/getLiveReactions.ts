import type { Response, Request } from 'express';
import { prisma } from '../../config/database';

export async function getLiveReactions(req: Request, res: Response): Promise<void> {
  try {
    const targetIdParam = req.params?.targetId;
    const targetTypeParam = req.params?.targetType;

    const targetId =
      typeof targetIdParam === 'string' && targetIdParam.trim().length > 0 ? targetIdParam : undefined;
    const targetType =
      typeof targetTypeParam === 'string' && targetTypeParam.trim().length > 0 ? targetTypeParam : undefined;

    if (!targetId || !targetType) {
      res.status(400).json({ success: false, message: 'Geçersiz hedef bilgileri' });
      return;
    }

    const q = req.query as Record<string, unknown>;
    const lastTimestampParam = Array.isArray(q.lastTimestamp) ? q.lastTimestamp[0] : q.lastTimestamp;
    const sinceRaw = lastTimestampParam ? new Date(String(lastTimestampParam)) : undefined;
    const since = sinceRaw && !isNaN(sinceRaw.getTime()) ? sinceRaw : undefined;

    const reactions = await prisma.reaction.findMany({
      where: {
        targetId,
        targetType,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ success: true, data: reactions });
  } catch (error) {
    console.error('Get live reactions error:', error);
    res.status(500).json({ success: false, message: 'Canlı tepkiler getirilirken hata oluştu' });
  }
}