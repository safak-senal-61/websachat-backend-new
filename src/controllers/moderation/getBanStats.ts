import { Request, Response } from 'express';

export async function getBanStats(req: Request, res: Response): Promise<Response> {
  try {
    return res.status(501).json({
      success: false,
      message: 'Ban statistics are not implemented with Prisma yet. Please add a Ban model to Prisma schema.',
    });
  } catch (error: unknown) {
    console.error('Get ban stats error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve ban statistics' });
  }
}