import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export async function getRevenueAnalytics(req: Request, res: Response): Promise<Response> {
  try {
    const {
      period = 'monthly',
      startDate,
      endDate,
      revenueType = 'all',
      currency = 'USD',
      groupBy,
      // includeProjections kaldırıldı (kullanılmıyor)
      includeBreakdown = true
    } = req.query as Partial<{
      period: string;
      startDate: string;
      endDate: string;
      revenueType: string;
      currency: string;
      groupBy: 'day' | 'week' | 'month' | 'year';
      includeBreakdown: boolean | string;
    }>;

    // Tarih filtresi
    const now = new Date();
    const periodMap: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
    const where: { type?: string; createdAt?: { gte?: Date; lte?: Date } } = {};

    if (revenueType !== 'all') {
      where.type = String(revenueType);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    } else if (period !== 'all') {
      const days = periodMap[String(period)] ?? 30;
      where.createdAt = { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
    }

    type Tx = { amount: number | null; type: string | null; createdAt: Date };
    const prismaTx = prisma as unknown as {
      transaction: {
        findMany: (args: {
          where: { type?: string; createdAt?: { gte?: Date; lte?: Date } };
          select: { amount: true; type: true; createdAt: true };
        }) => Promise<Tx[]>;
      };
    };
    const transactions: Tx[] = await prismaTx.transaction.findMany({
      where,
      select: { amount: true, type: true, createdAt: true }
    });

    const totalRevenue = transactions.reduce((sum: number, t: Tx) => sum + Number(t.amount ?? 0), 0);
    const totalTransactions = transactions.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const getISOWeek = (date: Date): { year: number; week: number } => {
      const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return { year: tmp.getUTCFullYear(), week: weekNum };
    };

    const getGroupKey = (d: Date, gb?: 'day' | 'week' | 'month' | 'year'): string => {
      if (!gb) return 'all';
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      switch (gb) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week': {
        const { year: wy, week } = getISOWeek(d);
        return `${wy}-W${String(week).padStart(2, '0')}`;
      }
      case 'month':
        return `${year}-${month}`;
      case 'year':
        return `${year}`;
      default:
        return 'all';
      }
    };

    type GroupAnalyticsItem = {
      _id: string;
      totalRevenue: number;
      totalTransactions: number;
      averageTransactionValue: number;
      revenueByType: Array<{ type: string; amount: number }>;
    };

    let analytics: GroupAnalyticsItem | GroupAnalyticsItem[];

    if (groupBy) {
      const groups = new Map<
        string,
        {
          totalRevenue: number;
          totalTransactions: number;
          amounts: number[];
          revenueByType: Array<{ type: string; amount: number }>;
        }
      >();

      for (const t of transactions) {
        const key = getGroupKey(new Date(t.createdAt), groupBy);
        let g = groups.get(key);
        if (!g) {
          g = {
            totalRevenue: 0,
            totalTransactions: 0,
            amounts: [],
            revenueByType: []
          };
          groups.set(key, g);
        }
        const amt = Number(t.amount ?? 0);
        g.totalRevenue += amt;
        g.totalTransactions += 1;
        g.amounts.push(amt);
        g.revenueByType.push({ type: String(t.type ?? 'UNKNOWN'), amount: amt });
      }

      analytics = Array.from(groups.entries())
        .map(([key, g]) => ({
          _id: key,
          totalRevenue: g.totalRevenue,
          totalTransactions: g.totalTransactions,
          averageTransactionValue:
            g.amounts.length ? g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length : 0,
          revenueByType: g.revenueByType
        }))
        .sort((a, b) => (a._id > b._id ? 1 : a._id < b._id ? -1 : 0));
    } else {
      analytics = {
        _id: 'all',
        totalRevenue,
        totalTransactions,
        averageTransactionValue,
        revenueByType: transactions.map((t: Tx) => ({
          type: String(t.type ?? 'UNKNOWN'),
          amount: Number(t.amount ?? 0)
        }))
      };
    }

    let breakdown: Array<{
      _id: string;
      totalRevenue: number;
      totalTransactions: number;
      averageValue: number;
    }> | null = null;

    if (String(includeBreakdown).toLowerCase() === 'true' || includeBreakdown === true) {
      const typeMap = new Map<string, { totalRevenue: number; totalTransactions: number; amounts: number[] }>();
      for (const t of transactions) {
        const typeKey = String(t.type ?? 'UNKNOWN');
        let v = typeMap.get(typeKey);
        if (!v) {
          v = { totalRevenue: 0, totalTransactions: 0, amounts: [] };
          typeMap.set(typeKey, v);
        }
        const amt = Number(t.amount ?? 0);
        v.totalRevenue += amt;
        v.totalTransactions += 1;
        v.amounts.push(amt);
      }
      breakdown = Array.from(typeMap.entries())
        .map(([type, v]) => ({
          _id: type,
          totalRevenue: v.totalRevenue,
          totalTransactions: v.totalTransactions,
          averageValue: v.amounts.length
            ? v.amounts.reduce((a, b) => a + b, 0) / v.amounts.length
            : 0
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    return res.json({
      success: true,
      message: 'Revenue analytics retrieved successfully',
      data: {
        analytics,
        breakdown,
        period,
        groupBy,
        filters: { revenueType, currency, startDate, endDate }
      }
    });
  } catch (error: unknown) {
    console.error('Get revenue analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve revenue analytics' });
  }
}