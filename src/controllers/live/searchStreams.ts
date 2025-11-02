import { Request, Response } from 'express';

import { logger } from '@/utils/logger';
import { prisma } from '../../config/database';
import type { Prisma, $Enums } from '../../generated/prisma';
import { StreamStatus, StreamVisibility, StreamCategory } from '../../generated/prisma';

export async function searchStreams(req: Request, res: Response): Promise<void> {
  try {
    const {
      q,
      category,
      status = 'live',
      visibility = 'public',
      language,
      ageRating,
      minViewers,
      maxViewers,
      tags,
      sortBy = 'viewers',
      page = 1,
      limit = 20,
    } = req.query;

    // any yerine tipli where
    const where: Prisma.LiveStreamWhereInput = {};

    if (status) {
      const upperStatus = String(status).toUpperCase();
      // Geçerli enum kontrolü
      if (Object.values(StreamStatus).includes(upperStatus as (typeof StreamStatus)[keyof typeof StreamStatus])) {
        where.status = { equals: upperStatus as $Enums.StreamStatus };
      }
    }

    if (visibility) {
      const vis = String(visibility).toUpperCase();
      if (vis === StreamVisibility.PUBLIC) {
        // Enum dizisiyle tipli in filtresi
        where.visibility = { in: [StreamVisibility.PUBLIC, StreamVisibility.FOLLOWERS_ONLY] };
      } else if (Object.values(StreamVisibility).includes(vis as (typeof StreamVisibility)[keyof typeof StreamVisibility])) {
        where.visibility = { equals: vis as $Enums.StreamVisibility };
      }
    }

    if (category) {
      const upperCategory = String(category).toUpperCase();
      if (Object.values(StreamCategory).includes(upperCategory as (typeof StreamCategory)[keyof typeof StreamCategory])) {
        where.category = { equals: upperCategory as $Enums.StreamCategory };
      }
    }

    // Extract selected tags from query for client-side filtering (SQLite JSON)
    const selectedTags: string[] = Array.isArray(tags)
      ? (tags as unknown[]).map(String)
      : typeof tags === 'string'
        ? String(tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        : [];

    // Temel filtrelere göre DB'den çek
    const baseStreams = await prisma.liveStream.findMany({
      where,
      include: {
        streamer: { select: { username: true, displayName: true, avatar: true, isVerified: true } },
      },
    });

    // JSON metadata/stats için tipli arayüzler
    interface LiveStreamMetadata {
      language?: string;
      ageRating?: string;
    }
    interface LiveStreamStats {
      currentViewers?: number;
      totalDuration?: number;
    }

    // Gelişmiş filtreler (metadata/stats JSON) in-memory
    let streams = baseStreams.filter((s) => {
      const meta = (s.metadata ?? {}) as LiveStreamMetadata;
      const stats = (s.stats ?? {}) as LiveStreamStats;
  
      if (language && meta.language && String(meta.language) !== String(language)) return false;
      if (ageRating && meta.ageRating && String(meta.ageRating) !== String(ageRating)) return false;
  
      const cv = stats.currentViewers ?? 0;
      if (minViewers && cv < parseInt(minViewers as string)) return false;
      if (maxViewers && cv > parseInt(maxViewers as string)) return false;

      // Tags filter in-memory (hasSome semantics)
      if (selectedTags.length > 0) {
        const streamTags = Array.isArray(s.tags)
          ? (s.tags as unknown[]).filter((t) => typeof t === 'string') as string[]
          : [];
        if (!selectedTags.some((t) => streamTags.includes(t))) return false;
      }
  
      if (q) {
        const qq = String(q).toLowerCase();
        const text = `${s.title || ''} ${s.description || ''}`.toLowerCase();
        if (!text.includes(qq)) return false;
      }
  
      return true;
    });

    // Sıralama
    streams.sort((a, b) => {
      const sa = (a.stats ?? {}) as LiveStreamStats;
      const sb = (b.stats ?? {}) as LiveStreamStats;
      switch (sortBy) {
      case 'viewers':
        return (sb.currentViewers || 0) - (sa.currentViewers || 0);
      case 'recent':
        return new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime();
      case 'duration':
        return (sb.totalDuration || 0) - (sa.totalDuration || 0);
      case 'relevance': {
        if (q) {
          const qq = String(q).toLowerCase();
          const score = (st: { title?: string | null; description?: string | null }): number => {
            const text = `${st.title || ''} ${st.description || ''}`.toLowerCase();
            return text.includes(qq) ? 1 : 0;
          };
          return score(b) - score(a);
        }
        return (sb.currentViewers || 0) - (sa.currentViewers || 0);
      }
      default:
        return (sb.currentViewers || 0) - (sa.currentViewers || 0);
      }
    });

    const total = streams.length;
    const pageNum = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const start = (pageNum - 1) * pageSize;
    const paged = streams.slice(start, start + pageSize);

    res.json({
      success: true,
      data: {
        streams: paged.map((stream) => ({
          ...stream,
          technical: undefined,
        })),
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          pages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Error searching streams:', error instanceof Error ? error : { error });
    throw error;
  }
}