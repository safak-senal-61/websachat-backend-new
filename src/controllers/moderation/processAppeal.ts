import { Request, Response } from 'express';

export async function processAppeal(req: Request, res: Response): Promise<Response> {
  try {
    return res.status(501).json({
      success: false,
      message: 'Process appeal is not implemented with Prisma yet. Please add a Ban model to Prisma schema.',
    });
  } catch (error: unknown) {
    console.error('Process appeal error:', error instanceof Error ? error : { error });
    const message = error instanceof Error ? error.message : 'Failed to process appeal';
    return res.status(500).json({ success: false, message });
  }
}