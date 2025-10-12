import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';

export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      paymentMethod,
      userId,
      minAmount,
      maxAmount,
    } = req.query;
    const where: Prisma.TransactionWhereInput = {};
    if (type) where.type = String(type).toUpperCase() as $Enums.TransactionType;
    if (status) where.status = String(status).toUpperCase() as $Enums.TransactionStatus;
    if (paymentMethod) where.paymentMethodType = String(paymentMethod);
    if (userId) where.userId = String(userId);
    if (minAmount || maxAmount) {
      where.amount = {
        ...(minAmount ? { gte: parseFloat(minAmount as string) } : {}),
        ...(maxAmount ? { lte: parseFloat(maxAmount as string) } : {}),
      };
    }
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string, 10),
        include: {
          user: { select: { username: true, displayName: true, avatar: true, email: true } },
          reviewedBy: { select: { username: true, displayName: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);
    res.status(200).json({
      success: true,
      message: 'All transactions retrieved successfully',
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
    console.error('Get all transactions error:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get transactions',
    });
  }
};