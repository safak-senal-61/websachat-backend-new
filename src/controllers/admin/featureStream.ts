import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';
import type { Prisma } from '@/generated/prisma';

export async function featureStream(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const featured = Boolean(req.body.featured);

  const current = await prisma.liveStream.findUnique({
    where: { id },
    select: { metadata: true, id: true, title: true }
  });
  if (!current) throw createError('Stream not found', 404);

  const metadata = (current.metadata ?? {}) as Record<string, unknown>;
  const updatedMetadata = { ...metadata, featured } as Prisma.InputJsonValue;

  const updated = await prisma.liveStream.update({
    where: { id },
    data: { metadata: updatedMetadata },
    select: { id: true, title: true, metadata: true, updatedAt: true }
  });

  res.json({
    success: true,
    message: featured ? 'Stream featured' : 'Stream unfeatured',
    data: { stream: updated }
  });
}