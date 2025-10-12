import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export async function appealReport(req: Request, res: Response): Promise<Response> {
  try {
    const { reportId } = req.params as { reportId: string };
    const { appealReason } = req.body;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Basic "appeal" handling: append to description and mark as REVIEWED if needed
    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        description: [report.description, `Appeal: ${appealReason}`].filter(Boolean).join('\n'),
        // remove any casts; use string literal checks consistent with Prisma enum values
        status: report.status === 'DISMISSED' ? 'REVIEWED' : report.status,
      },
    });

    return res.json({
      success: true,
      message: 'Appeal submitted successfully',
      data: { report: updated },
    });
  } catch (error: unknown) {
    console.error('Appeal report error:', error instanceof Error ? error : { error });
    const message = error instanceof Error ? error.message : 'Failed to submit appeal';
    return res.status(500).json({ success: false, message });
  }
}