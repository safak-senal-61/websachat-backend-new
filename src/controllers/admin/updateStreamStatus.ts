import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';
import { StreamStatus } from '@/generated/prisma';

function toStatusEnum(status: string): StreamStatus {
  switch (status.toLowerCase()) {
  case 'scheduled': return StreamStatus.SCHEDULED;
  case 'live': return StreamStatus.LIVE;
  case 'ended': return StreamStatus.ENDED;
  case 'paused': return StreamStatus.PAUSED;
  default: throw createError('Invalid stream status', 400);
  }
}

export async function updateStreamStatus(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const statusInput = String(req.body.status ?? '');
  const statusEnum = toStatusEnum(statusInput);

  const stream = await prisma.liveStream.findUnique({ where: { id } });
  if (!stream) throw createError('Stream not found', 404);

  const updated = await prisma.liveStream.update({
    where: { id },
    data: { status: statusEnum },
    select: {
      id: true, title: true, status: true, visibility: true, updatedAt: true
    },
  });

  res.json({ success: true, message: 'Stream status updated', data: { stream: updated } });
}