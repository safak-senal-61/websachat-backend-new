import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';

export const getPendingTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, type, paymentMethod } = req.query;
    const where: Prisma.TransactionWhereInput = {
      status: { in: ['PENDING', 'PROCESSING'] as $Enums.TransactionStatus[] },
    };
    if (type) where.type = String(type).toUpperCase() as $Enums.TransactionType;
    if (paymentMethod) where.paymentMethodType = String(paymentMethod);
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string, 10),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.status(200).json({
      success: true,
      message: 'Pending transactions retrieved successfully',
      data: {
        transactions,
        pagination: {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          total,
          pages: Math.ceil(total / parseInt(limit as string, 10)),
        },
      },
    });
  } catch (error: unknown) {
    console.error('Get pending transactions error:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get pending transactions',
    });
  }
};