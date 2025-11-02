import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import type { Prisma } from '@/generated/prisma';
import { StreamStatus, StreamVisibility, StreamCategory } from '@/generated/prisma';

function toStatusEnum(status?: string): StreamStatus | undefined {
  switch ((status ?? '').toLowerCase()) {
  case 'scheduled': return StreamStatus.SCHEDULED;
  case 'live': return StreamStatus.LIVE;
  case 'ended': return StreamStatus.ENDED;
  case 'paused': return StreamStatus.PAUSED;
  default: return undefined;
  }
}

function toVisibilityEnum(visibility?: string): StreamVisibility | undefined {
  switch ((visibility ?? '').toLowerCase()) {
  case 'public': return StreamVisibility.PUBLIC;
  case 'private': return StreamVisibility.PRIVATE;
  case 'followers-only': return StreamVisibility.FOLLOWERS_ONLY;
  default: return undefined;
  }
}

// StreamCategory için güvenli dönüştürücü
function toCategoryEnum(category?: string): StreamCategory | undefined {
  const upper = String(category ?? '').toUpperCase();
  return (Object.values(StreamCategory) as string[]).includes(upper)
    ? (upper as StreamCategory)
    : undefined;
}

export async function getStreams(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const q = String(req.query.q ?? '').trim();
  const status = toStatusEnum(String(req.query.status ?? ''));
  const visibility = toVisibilityEnum(String(req.query.visibility ?? ''));
  const category = toCategoryEnum(String(req.query.category ?? ''));
  const sort = String(req.query.sort ?? 'createdAt');
  const order = String(req.query.order ?? 'desc').toLowerCase();

  // Build DB where without text search to avoid unsupported 'mode' on SQLite
  const whereDB: Prisma.LiveStreamWhereInput = {};
  if (status) whereDB.status = status;
  if (visibility) whereDB.visibility = visibility;
  if (category) whereDB.category = category;

  const orderKey: 'createdAt' | 'title' | 'status' =
    sort === 'title' ? 'title' : sort === 'status' ? 'status' : 'createdAt';
  const orderDir: Prisma.SortOrder = order === 'asc' ? 'asc' : 'desc';
  const orderBy: Prisma.LiveStreamOrderByWithRelationInput = { [orderKey]: orderDir };

  const baseStreams = await prisma.liveStream.findMany({
    where: whereDB,
    orderBy,
    select: {
      id: true,
      streamId: true,
      title: true,
      description: true,
      thumbnail: true,
      category: true,
      tags: true,
      status: true,
      visibility: true,
      scheduledAt: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      updatedAt: true,
      streamer: {
        select: { id: true, username: true, displayName: true, avatar: true }
      }
    },
  });

  // Text search (case-insensitive) in-memory across title, description, streamer.username
  const qLower = q.toLowerCase();
  const filtered = q
    ? baseStreams.filter((s) => {
      const title = (s.title ?? '').toLowerCase();
      const desc = (s.description ?? '').toLowerCase();
      const uname = (s.streamer?.username ?? '').toLowerCase();
      return title.includes(qLower) || desc.includes(qLower) || uname.includes(qLower);
    })
    : baseStreams;

  const total = filtered.length;
  const start = (page - 1) * limit;
  const streams = filtered.slice(start, start + limit);

  res.json({
    success: true,
    data: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      streams,
    },
  });
}