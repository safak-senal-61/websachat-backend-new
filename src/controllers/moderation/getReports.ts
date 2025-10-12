import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { Prisma, ReportStatus, ReportType } from '../../generated/prisma';

export async function getReports(req: Request, res: Response): Promise<Response> {
  try {
    // Query paramlarını güvenli parse et
    const qp = (name: string): string | undefined => {
      const v = (req.query as Record<string, unknown> | undefined)?.[name];
      if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : undefined;
      return typeof v === 'string' ? v : undefined;
    };

    const pageStr = qp('page') ?? '1';
    const limitStr = qp('limit') ?? '20';
    const statusStr = qp('status');
    const categoryStr = qp('category');
    const reporterId = qp('reporterId');
    const reportedUserId = qp('reportedUserId');
    const startDateStr = qp('startDate');
    const endDateStr = qp('endDate');
    const sortByStr = qp('sortBy') ?? 'createdAt';
    const sortOrderStr = qp('sortOrder') ?? 'desc';

    const where: Prisma.ReportWhereInput = {};
    if (statusStr) {
      const upper = statusStr.toUpperCase();
      const statusValue =
        upper in ReportStatus ? ReportStatus[upper as keyof typeof ReportStatus] : undefined;
      if (statusValue) where.status = statusValue;
    }
    if (categoryStr) {
      const upper = categoryStr.toUpperCase();
      const typeValue =
        upper in ReportType ? ReportType[upper as keyof typeof ReportType] : ReportType.OTHER;
      where.type = typeValue;
    }
    if (reporterId) where.reporterId = reporterId;
    if (reportedUserId) where.reportedId = reportedUserId;

    if (startDateStr || endDateStr) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDateStr) createdAt.gte = new Date(startDateStr);
      if (endDateStr) createdAt.lte = new Date(endDateStr);
      where.createdAt = createdAt;
    }

    const page = Number(pageStr);
    const limit = Number(limitStr);
    const skip = (page - 1) * limit;

    // Sıralamayı güvenli alanlarla sınırla
    const allowedSortFields = ['createdAt', 'updatedAt', 'status', 'type'] as const;
    type AllowedSortField = typeof allowedSortFields[number];
    const asAllowedSortField = (s: string): AllowedSortField => {
      return (allowedSortFields as readonly string[]).includes(s) ? (s as AllowedSortField) : 'createdAt';
    };
    const field = asAllowedSortField(sortByStr);
    const ord: Prisma.SortOrder = sortOrderStr === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.ReportOrderByWithRelationInput = { [field]: ord };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { username: true, email: true } },
          reported: { select: { username: true, email: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return res.json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: unknown) {
    console.error('Get reports error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve reports' });
  }
}