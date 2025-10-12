import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';

export async function deleteStream(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  const existing = await prisma.liveStream.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw createError('Stream not found', 404);

  await prisma.liveStream.delete({ where: { id } });

  res.json({ success: true, message: 'Stream deleted successfully' });
}