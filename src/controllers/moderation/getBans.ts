import { Request, Response } from 'express';

export async function getBans(req: Request, res: Response): Promise<Response> {
  try {
    return res.status(501).json({
      success: false,
      message: 'Ban listing is not implemented with Prisma yet. Please add a Ban model to Prisma schema.',
    });
  } catch (error) {
    console.error('Get bans error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bans' });
  }
}