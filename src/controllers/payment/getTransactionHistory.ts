import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';

export const getTransactionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate,
      paymentMethod,
    } = req.query;

    const where: Prisma.TransactionWhereInput = { userId };
    if (type) where.type = String(type).toUpperCase() as unknown as $Enums.TransactionType;
    if (status) where.status = String(status).toUpperCase() as unknown as $Enums.TransactionStatus;
    if (paymentMethod) {
      where.paymentMethodType = String(paymentMethod).toUpperCase();
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const pageNum = typeof page === 'string' ? parseInt(page, 10) || 1 : Number(page) || 1;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) || 20 : Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: unknown) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get transaction history',
    });
  }
};