import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export async function assignReport(req: Request, res: Response): Promise<Response> {
  try {
    const { reportId } = req.params as { reportId: string };
    const { moderatorId } = req.body;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Set the reviewer (assignment)
    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        reviewedById: moderatorId,
        // remove any casts; use string literal checks consistent with Prisma enum values
        status: report.status === 'PENDING' ? 'REVIEWED' : report.status,
        reviewedAt: report.status === 'PENDING' ? new Date() : report.reviewedAt,
      },
    });

    return res.json({
      success: true,
      message: 'Report assigned successfully',
      data: { report: updated },
    });
  } catch (error: unknown) {
    console.error('Assign report error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to assign report' });
  }
}