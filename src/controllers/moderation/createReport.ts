import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { ReportType, ReportStatus } from '../../generated/prisma';

export async function createReport(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const {
      reportedUserId,
      reportedContent,
      category,
      reason,
      description,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Validate reported user if provided
    if (reportedUserId) {
      const reportedUser = await prisma.user.findUnique({ where: { id: reportedUserId as string } });
      if (!reportedUser) {
        return res.status(404).json({ success: false, message: 'Reported user not found' });
      }
    }

    // Validate reported content if provided (stream/comment)
    if (reportedContent?.contentType && reportedContent?.contentId) {
      if (reportedContent.contentType === 'stream') {
        const stream = await prisma.liveStream.findUnique({ where: { id: reportedContent.contentId } });
        if (!stream) {
          return res.status(404).json({ success: false, message: 'Reported stream not found' });
        }
      } else if (reportedContent.contentType === 'comment') {
        const comment = await prisma.comment.findUnique({ where: { id: reportedContent.contentId } });
        if (!comment) {
          return res.status(404).json({ success: false, message: 'Reported comment not found' });
        }
      }
    }

    const typeUpper = (category || reportedContent?.contentType || 'OTHER').toString().toUpperCase();
    const allowedTypes = Object.values(ReportType) as string[];
    const type = allowedTypes.includes(typeUpper)
      ? (typeUpper as typeof ReportType[keyof typeof ReportType])
      : ReportType.OTHER;

    // Prevent duplicate pending reports for same reported user by same reporter (basic check)
    if (reportedUserId) {
      const existing = await prisma.report.findFirst({
        where: {
          reporterId: userId,
          reportedId: reportedUserId,
          status: { in: [ReportStatus.PENDING] },
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'You have already reported this user and it is still pending',
        });
      }
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedId: reportedUserId || userId,
        type,
        reason: reason || 'No reason provided',
        description: description || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: { report },
    });
  } catch (error: unknown) {
    console.error('Create report error:', error instanceof Error ? error : { error });
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create report',
    });
  }
}