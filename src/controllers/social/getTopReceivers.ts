// getTopReceivers.ts dosyasındaki export async function getTopReceivers() bloğu
import { Response, Request } from 'express';
import { prisma } from '../../config/database';
import { Prisma } from '../../generated/prisma';
import { kurusToTL } from '@/utils/currency';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export async function getTopReceivers(req: Request, res: Response): Promise<void> {
  try {
    const period = String(req.query.period ?? 'monthly');
    const limitNumRaw = Number(req.query.limit ?? 10);
    const limitNum = Number.isFinite(limitNumRaw) ? Math.min(Math.max(limitNumRaw, 1), 100) : 10;

    const now = new Date();
    let startDate: Date;
    switch (period) {
    case 'daily': {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'weekly': {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case 'monthly': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    default: {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    }

    const rows = await prisma.$queryRaw<Array<{
      userId: string;
      totalValueCents: number;
      totalQuantity: number;
      giftEvents: number;
    }>>(Prisma.sql`
      SELECT "receiverId" AS "userId",
             SUM("value" * "quantity") AS "totalValueCents",
             SUM("quantity") AS "totalQuantity",
             COUNT(*) AS "giftEvents"
      FROM "gifts"
      WHERE "createdAt" >= ${startDate}
      GROUP BY "receiverId"
      ORDER BY "totalValueCents" DESC
      LIMIT ${limitNum}
    `);

    // Gift economy ayarlarını yükle
    const economySetting = await prisma.systemSetting.findUnique({
      where: { key: 'gift_economy' },
      select: { value: true },
    });
    let coinKurus = 100;
    let commissionRate = 0.2;
    if (economySetting?.value) {
      try {
        const parsed = JSON.parse(economySetting.value as string);
        if (isRecord(parsed)) {
          if (typeof parsed.coin_kurus === 'number') coinKurus = parsed.coin_kurus;
          if (typeof parsed.commission_rate === 'number') commissionRate = parsed.commission_rate;
        }
      } catch {
        // geçersiz JSON içeriğinde varsayılanlar kullanılmaya devam edilir
      }
    }

    const userIds = rows.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true, avatar: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const data = rows.map(r => {
      const totalCoins = Number(r.totalValueCents);
      const totalKurus = Math.floor(totalCoins * Number(coinKurus));
      const totalTL = kurusToTL(totalKurus);

      const appCommissionKurus = Math.floor(totalKurus * Number(commissionRate));
      const receiverKurus = totalKurus - appCommissionKurus;
      const receiverTL = kurusToTL(receiverKurus);

      return {
        userId: r.userId,
        totalCoins,
        totalKurus,
        totalTL,
        receiverKurus,
        receiverTL,
        totalQuantity: Number(r.totalQuantity),
        giftEvents: Number(r.giftEvents),
        user: userMap.get(r.userId) ?? null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get top receivers error:', error);
    res.status(500).json({ success: false, message: 'En çok hediye alıcılar getirilirken hata oluştu' });
  }
}