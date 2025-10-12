import { Request, Response } from 'express';

export async function cleanupExpiredBans(req: Request, res: Response): Promise<Response> {
  try {
    return res.status(501).json({
      success: false,
      message: 'Cleanup expired bans is not implemented with Prisma yet. Please add a Ban model to Prisma schema.',
    });
  } catch (error: unknown) {
    console.error('Cleanup expired bans error:', error instanceof Error ? error : { error });
    return res.status(500).json({ success: false, message: 'Failed to cleanup expired bans' });
  }
}