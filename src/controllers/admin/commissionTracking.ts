import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '@/utils/logger';
import { kurusToTL } from '@/utils/currency';
import type { Prisma } from '@/generated/prisma';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// Komisyon özeti getir
export const getCommissionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // Toplam komisyon tutarını getir
    const commissionSetting = await prisma.systemSetting.findUnique({
      where: { key: 'commission_total_kurus' }
    });

    const rawVal = commissionSetting?.value;
    let totalCommissionKurus = 0;
    if (typeof rawVal === 'string') {
      try {
        const parsed = JSON.parse(rawVal) as unknown;
        if (isRecord(parsed)) {
          const t = (parsed as { total?: unknown }).total;
          totalCommissionKurus = typeof t === 'number' ? Math.floor(t) : Number(t) || 0;
        } else {
          const parsedInt = parseInt(rawVal, 10);
          totalCommissionKurus = Number.isNaN(parsedInt) ? 0 : parsedInt;
        }
      } catch {
        const parsedInt = parseInt(rawVal, 10);
        totalCommissionKurus = Number.isNaN(parsedInt) ? 0 : parsedInt;
      }
    } else if (isRecord(rawVal)) {
      const t = (rawVal as { total?: unknown }).total;
      totalCommissionKurus = typeof t === 'number' ? Math.floor(t) : Number(t) || 0;
    } else if (typeof rawVal === 'number') {
      totalCommissionKurus = Math.floor(rawVal);
    }

    // Komisyon işlemlerini getir (son 100 işlem)
    const commissionTransactions = await prisma.transaction.findMany({
      where: {
        type: 'TRANSFER',
        description: {
          contains: 'Commission'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Günlük komisyon istatistikleri (son 30 gün)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCommissions = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        type: 'TRANSFER',
        description: {
          contains: 'Commission'
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        amount: true
      }
    });

    // Günlük verileri formatla
    const dailyStats = (dailyCommissions as Array<{ createdAt: Date; _sum: { amount: number | null } }>)
      .map((day) => ({
        date: day.createdAt.toISOString().split('T')[0],
        totalKurus: day._sum.amount || 0,
        totalTL: kurusToTL(day._sum.amount || 0),
      }));

    res.json({
      success: true,
      data: {
        summary: {
          totalCommissionKurus,
          totalCommissionTL: kurusToTL(totalCommissionKurus),
          transactionCount: commissionTransactions.length
        },
        recentTransactions: commissionTransactions.map((tx: {
          id: string;
          amount: number;
          description: string | null;
          createdAt: Date;
          user: { id: string; username: string | null; email: string | null };
        }) => ({
          id: tx.id,
          amount: tx.amount,
          amountTL: kurusToTL(tx.amount),
          description: tx.description,
          createdAt: tx.createdAt,
          user: tx.user
        })),
        dailyStats
      }
    });
  } catch (error) {
    logger.error('Error fetching commission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Komisyon özeti getirilirken hata oluştu'
    });
  }
};

// Detaylı komisyon raporu getir
export const getCommissionReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const pageNum = Number.parseInt(String(page), 10);
    const limitNum = Number.parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    // Tarih filtreleri
    const whereClause: Prisma.TransactionWhereInput = {
      type: 'TRANSFER',
      description: {
        contains: 'Commission'
      }
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(String(endDate));
      }
    }

    // Toplam sayı
    const totalCount = await prisma.transaction.count({
      where: whereClause
    });

    // İşlemleri getir
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Toplam komisyon tutarı (filtrelenmiş)
    const totalCommission = await prisma.transaction.aggregate({
      where: whereClause,
      _sum: {
        amount: true
      }
    });

    // Günlük dağılım (filtreye göre)
    const rawDaily = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: whereClause,
      _sum: { amount: true },
    });
    const dailyBreakdown = (rawDaily as Array<{ createdAt: Date; _sum: { amount: number | null } }>)
      .map((day) => ({
        date: day.createdAt.toISOString().split('T')[0],
        totalKurus: day._sum.amount || 0,
        totalTL: kurusToTL(day._sum.amount || 0),
      }));

    // En çok komisyon üreten kaynaklar (userId bazlı)
    const groupedByUser = await prisma.transaction.groupBy({
      by: ['userId'],
      where: whereClause,
      _sum: { amount: true },
    });

    const groups = groupedByUser as Array<{ userId: string | null; _sum: { amount: number | null } }>;
    const topGroups = groups
      .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
      .slice(0, 10);

    const userIds = topGroups.map(g => g.userId).filter((id): id is string => typeof id === 'string');

    const users: Array<{ id: string; username: string | null; email: string | null }> = userIds.length
      ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, email: true }
      })
      : [];

    const userMap = new Map<string, { id: string; username: string | null; email: string | null }>(
      users.map((u) => [u.id, u])
    );

    const topSources = topGroups.map(g => ({
      userId: g.userId,
      user: g.userId ? userMap.get(g.userId) ?? null : null,
      totalKurus: g._sum.amount ?? 0,
      totalTL: kurusToTL(g._sum.amount ?? 0),
    }));

    res.json({
      success: true,
      data: {
        transactions: transactions.map((tx: {
          id: string;
          amount: number;
          description: string | null;
          createdAt: Date;
          user: { id: string; username: string | null; email: string | null };
        }) => ({
          id: tx.id,
          amount: tx.amount,
          amountTL: kurusToTL(tx.amount),
          description: tx.description,
          createdAt: tx.createdAt,
          user: tx.user
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        },
        summary: {
          totalCommissionKurus: totalCommission._sum.amount || 0,
          totalCommissionTL: kurusToTL(totalCommission._sum.amount || 0),
          byDay: dailyBreakdown,
          topSources
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching commission report:', error);
    res.status(500).json({
      success: false,
      message: 'Komisyon raporu getirilirken hata oluştu'
    });
  }
};

// Hediye istatistikleri getir
export const getGiftStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    // Tarih filtreleri
    const whereClause: Prisma.GiftWhereInput = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    const giftStats = await prisma.gift.groupBy({
      by: ['giftType'],
      where: whereClause,
      _count: {
        id: true
      },
      _sum: {
        value: true
      }
    });

    const popularGifts = (giftStats as Array<{ giftType: string; _count: { id: number }; _sum: { value: number | null } }>)
      .sort((a, b) => (b._count?.id ?? 0) - (a._count?.id ?? 0))
      .slice(0, 10)
      .map((stat: { giftType: string; _count: { id: number }; _sum: { value: number | null } }) => ({
        giftType: stat.giftType,
        count: stat._count?.id ?? 0,
        totalCoins: stat._sum?.value ?? 0,
        totalTL: (((stat._sum?.value ?? 0)) / 100).toFixed(2)
      }));

    const totalGifts = await prisma.gift.aggregate({
      where: whereClause,
      _count: {
        id: true
      },
      _sum: {
        value: true
      }
    });

    // Günlük hediye trendi (son 30 gün)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyGifts = await prisma.gift.groupBy({
      by: ['createdAt'],
      where: {
        ...whereClause,
        createdAt: {
          gte: startDate ? new Date(startDate as string) : thirtyDaysAgo,
          ...(endDate && { lte: new Date(endDate as string) })
        }
      },
      _count: {
        id: true
      },
      _sum: {
        value: true
      }
    });

    const dailyTrend = (dailyGifts as Array<{ createdAt: Date; _count: { id: number }; _sum: { value: number | null } }>)
      .map((day: { createdAt: Date; _count: { id: number }; _sum: { value: number | null } }) => ({
        date: day.createdAt.toISOString().split('T')[0],
        giftCount: day._count?.id ?? 0,
        totalCoins: day._sum?.value ?? 0,
        totalTL: (((day._sum?.value ?? 0)) / 100).toFixed(2)
      }));

    res.json({
      success: true,
      data: {
        summary: {
          totalGifts: totalGifts._count?.id || 0,
          totalValue: totalGifts._sum?.value || 0,
          totalValueTL: (((totalGifts._sum?.value || 0)) / 100).toFixed(2)
        },
        popularGifts,
        dailyTrend
      }
    });
  } catch (error) {
    logger.error('Error fetching gift statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Hediye istatistikleri getirilirken hata oluştu'
    });
  }
};