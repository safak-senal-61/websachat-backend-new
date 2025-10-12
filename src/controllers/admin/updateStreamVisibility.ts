import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';
import { StreamVisibility } from '@/generated/prisma';

function toVisibilityEnum(visibility: string): StreamVisibility {
  switch (visibility.toLowerCase()) {
  case 'public': return StreamVisibility.PUBLIC;
  case 'private': return StreamVisibility.PRIVATE;
  case 'followers-only': return StreamVisibility.FOLLOWERS_ONLY;
  default: throw createError('Invalid stream visibility', 400);
  }
}

export async function updateStreamVisibility(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const visibilityInput = String(req.body.visibility ?? '');
  const visibilityEnum = toVisibilityEnum(visibilityInput);

  const stream = await prisma.liveStream.findUnique({ where: { id } });
  if (!stream) throw createError('Stream not found', 404);

  const updated = await prisma.liveStream.update({
    where: { id },
    data: { visibility: visibilityEnum },
    select: {
      id: true, title: true, status: true, visibility: true, updatedAt: true
    },
  });

  res.json({ success: true, message: 'Stream visibility updated', data: { stream: updated } });
}