import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export async function getReport(req: Request, res: Response): Promise<Response> {
  try {
    const { reportId } = req.params as { reportId: string };

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { username: true, email: true } },
        reported: { select: { username: true, email: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    return res.json({
      success: true,
      message: 'Report retrieved successfully',
      data: { report },
    });
  } catch (error) {
    console.error('Get report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve report' });
  }
}