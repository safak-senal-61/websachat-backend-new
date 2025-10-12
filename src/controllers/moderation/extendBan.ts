import { Request, Response } from 'express';

export async function extendBan(req: Request, res: Response): Promise<Response> {
  try {
    return res.status(501).json({
      success: false,
      message: 'Extend ban is not implemented with Prisma yet. Please add a Ban model to Prisma schema.',
    });
  } catch (error: unknown) {
    console.error('Extend ban error:', error instanceof Error ? error : { error });
    const message = error instanceof Error ? error.message : 'Failed to extend ban';
    return res.status(500).json({ success: false, message });
  }
}