import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { ReportStatus } from '../../generated/prisma';

export async function getModeratorWorkload(req: Request, res: Response): Promise<Response> {
  try {
    const pendingCount = await prisma.report.count({ where: { status: ReportStatus.PENDING } });

    const byModerator = await prisma.report.groupBy({
      by: ['reviewedById'],
      where: { reviewedById: { not: null } },
      _count: { _all: true },
    });

    type GroupRow = { reviewedById: string | null; _count: { _all: number } };
    const workload = {
      pendingCount,
      assignments: byModerator.map((m: GroupRow) => ({
        moderatorId: m.reviewedById,
        count: m._count._all,
      })),
    };

    return res.json({
      success: true,
      message: 'Moderator workload retrieved successfully',
      data: { workload },
    });
  } catch (error) {
    console.error('Get moderator workload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve moderator workload' });
  }
}