import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export const getRevenueStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'monthly' } = req.query as {
      period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    };
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let startDate: Date;
    switch (String(period).toLowerCase()) {
    case 'daily': startDate = startOfDay; break;
    case 'weekly': startDate = startOfWeek; break;
    case 'yearly': startDate = startOfYear; break;
    case 'monthly':
    default: startDate = startOfMonth; break;
    }

    const gifts = await prisma.gift.findMany({
      where: { createdAt: { gte: startDate } },
      select: { value: true, quantity: true },
    });

    const revenue = gifts.reduce((sum, g) => {
      const v = typeof g.value === 'number' ? g.value : 0;
      const q = typeof g.quantity === 'number' ? g.quantity : 1;
      return sum + v * q;
    }, 0);

    res.status(200).json({
      success: true,
      message: 'Revenue statistics retrieved successfully',
      data: { period: period as string, revenue, from: startDate, to: now },
    });
  } catch (error: unknown) {
    console.error('Revenue stats error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get revenue statistics',
    });
  }
};