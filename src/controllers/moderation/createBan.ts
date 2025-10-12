import { Request, Response } from 'express';

export async function createBan(req: Request, res: Response): Promise<Response> {
  try {
    return res.status(501).json({
      success: false,
      message: 'Ban functionality is not implemented with Prisma yet. Please add a Ban model to Prisma schema.',
    });
  } catch (error: unknown) {
    console.error('Create ban error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to create ban' });
  }
}