import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { formatDiamondBalance, formatTurkishLira } from '../../utils/currency';

export async function getVirtualBalance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }

    // Sanal bakiye bilgisini getir
    let virtualBalance = await prisma.virtualBalance.findUnique({
      where: { userId },
    });

    // Eğer sanal bakiye yoksa oluştur
    if (!virtualBalance) {
      virtualBalance = await prisma.virtualBalance.create({
        data: {
          userId,
          coins: 0,
          diamonds: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sanal bakiye başarıyla getirildi',
      data: {
        coins: virtualBalance.coins,
        diamonds: virtualBalance.diamonds,
        diamondBalanceTL: formatDiamondBalance(virtualBalance.diamonds), // "0.25", "1.00" formatında
        diamondBalanceFormatted: formatTurkishLira(virtualBalance.diamonds), // "₺0.25", "₺1.00" formatında
        lastUpdated: virtualBalance.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get virtual balance error:', error);
    res.status(500).json({ success: false, message: 'Sanal bakiye getirilirken hata oluştu' });
  }
}