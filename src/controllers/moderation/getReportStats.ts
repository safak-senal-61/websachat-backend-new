import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { Prisma, ReportStatus, ReportType } from '../../generated/prisma';

export async function getReportStats(req: Request, res: Response): Promise<Response> {
  try {
    // Safely parse query params without any
    const qp = (name: string): string | undefined => {
      const v = (req.query as Record<string, unknown> | undefined)?.[name];
      if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : undefined;
      return typeof v === 'string' ? v : undefined;
    };

    const period = (qp('period') ?? 'monthly') as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
    const startDateStr = qp('startDate');
    const endDateStr = qp('endDate');
    const categoryStr = qp('category');

    const where: Prisma.ReportWhereInput = {};

    if (categoryStr) {
      const upper = categoryStr.toUpperCase();
      // ReportType anahtar kontrolü ile $Enums.ReportType değerini al
      const typeValue =
        upper in ReportType
          ? ReportType[upper as keyof typeof ReportType]
          : ReportType.OTHER;
      where.type = typeValue;
    }

    // Date filters
    if (startDateStr || endDateStr) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDateStr) createdAt.gte = new Date(startDateStr);
      if (endDateStr) createdAt.lte = new Date(endDateStr);
      where.createdAt = createdAt;
    } else if (period !== 'all') {
      const now = new Date();
      const daysMap: Record<'daily' | 'weekly' | 'monthly' | 'yearly', number> = {
        daily: 1,
        weekly: 7,
        monthly: 30,
        yearly: 365,
      };
      const days = daysMap[period] ?? 30;
      where.createdAt = { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
    }

    const [total, pending, reviewed, resolved, dismissed, byType] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.count({ where: { ...where, status: ReportStatus.PENDING } }),
      prisma.report.count({ where: { ...where, status: ReportStatus.REVIEWED } }),
      prisma.report.count({ where: { ...where, status: ReportStatus.RESOLVED } }),
      prisma.report.count({ where: { ...where, status: ReportStatus.DISMISSED } }),
      prisma.report.groupBy({ by: ['type'], where, _count: { _all: true } }),
    ]);

    type TypeGroup = { type: typeof ReportType[keyof typeof ReportType]; _count: { _all: number } };
    return res.json({
      success: true,
      message: 'Report statistics retrieved successfully',
      data: {
        stats: { total, pending, reviewed, resolved, dismissed },
        categoryStats: (byType as TypeGroup[]).map((t) => ({ type: t.type, count: t._count._all })),
      },
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve report statistics' });
  }
}