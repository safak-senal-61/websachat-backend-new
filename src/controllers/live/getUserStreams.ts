import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { prisma } from '../../config/database';
import type { Prisma, StreamStatus } from '../../generated/prisma';

export async function getUserStreams(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { status, page = 1, limit = 20 } = req.query;

    if (!userId) {
      throw createError('Authentication required', 401);
    }

    const where: Prisma.LiveStreamWhereInput = { streamerId: userId };
    if (status) {
      const upperStatus = String(status).toUpperCase() as StreamStatus;
      where.status = { equals: upperStatus };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [streams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.liveStream.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        streams,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Error getting user streams:', error instanceof Error ? error : { error });
    throw error;
  }
}