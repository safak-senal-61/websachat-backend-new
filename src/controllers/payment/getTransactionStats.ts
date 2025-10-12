import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { $Enums } from '../../generated/prisma';

export const getTransactionStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { period = 'monthly' } = req.query;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let startDate: Date;
    switch (String(period).toLowerCase()) {
    case 'daily': startDate = startOfDay; break;
    case 'yearly': startDate = startOfYear; break;
    case 'monthly':
    default: startDate = startOfMonth; break;
    }

    const [depAgg, wdAgg, countAll] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          userId,
          type: 'DEPOSIT' as unknown as $Enums.TransactionType,
          createdAt: { gte: startDate },
          status: 'COMPLETED' as unknown as $Enums.TransactionStatus,
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          userId,
          type: 'WITHDRAW' as unknown as $Enums.TransactionType,
          createdAt: { gte: startDate },
          status: { in: (['COMPLETED', 'PROCESSING'] as string[]) as unknown as $Enums.TransactionStatus[] },
        },
      }),
      prisma.transaction.count({ where: { userId, createdAt: { gte: startDate } } }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Transaction statistics retrieved successfully',
      data: {
        period: String(period),
        totals: {
          depositsAmount: depAgg._sum.amount ?? 0,
          depositsCount: depAgg._count._all ?? 0,
          withdrawalsAmount: wdAgg._sum.amount ?? 0,
          withdrawalsCount: wdAgg._count._all ?? 0,
          transactionsCount: countAll,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get transaction statistics',
    });
  }
};