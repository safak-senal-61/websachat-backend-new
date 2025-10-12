import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export async function addReportNote(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const { reportId } = req.params as { reportId: string };
    const { note, action } = req.body;
    const moderatorId = req.user?.id;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const annotation = `Note${action ? `(${action})` : ''} by ${moderatorId || 'system'}: ${note}`;
    const newDescription = [report.description, annotation].filter(Boolean).join('\n');

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { description: newDescription },
    });

    return res.json({
      success: true,
      message: 'Note added successfully',
      data: { report: updated },
    });
  } catch (error: unknown) {
    console.error('Add report note error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
}