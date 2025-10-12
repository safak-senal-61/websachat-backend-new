import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { ReportStatus } from '../../generated/prisma';

export async function dismissReport(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { reportId } = req.params as { reportId: string };
    const { reason } = req.body;
    const moderatorId = req.user?.id;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.DISMISSED,
        resolution: reason || null,
        reviewedAt: new Date(),
        reviewedById: moderatorId || null,
      },
    });

    return res.json({
      success: true,
      message: 'Report dismissed successfully',
      data: { report: updated },
    });
  } catch (error: unknown) {
    console.error('Dismiss report error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to dismiss report' });
  }
}