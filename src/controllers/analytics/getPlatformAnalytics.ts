import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

type DateRange = { gte?: Date; lte?: Date };

interface StreamStats {
  totalDuration?: number;
  totalViewers?: number;
  peakViewers?: number;
  totalGifts?: number;
  totalComments?: number;
  revenue?: number;
}

function getDateRange(period?: string, startDate?: string | Date, endDate?: string | Date): DateRange {
  if (period === 'custom' && startDate && endDate) {
    return { gte: new Date(startDate), lte: new Date(endDate) };
  }
  if (startDate || endDate) {
    const range: { gte?: Date; lte?: Date } = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) range.lte = new Date(endDate);
    return range;
  }
  const now = new Date();
  const map: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
  const days = map[period || 'daily'] || 1;
  return { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), lte: now };
}

function shiftRangeBack(range: DateRange): DateRange {
  const dayMs = 24 * 60 * 60 * 1000;
  const end = range.lte || new Date();
  const start = range.gte || new Date(end.getTime() - 30 * dayMs); // Fallback: 30 gün
  const duration = end.getTime() - start.getTime();
  const prevEnd = start;
  const prevStart = new Date(start.getTime() - duration);
  return { gte: prevStart, lte: prevEnd };
}

export async function getPlatformAnalytics(req: Request, res: Response): Promise<Response> {
  try {
    const { period = 'daily', startDate, endDate, includeComparisons = true } = req.query as Partial<{
      period: string;
      startDate: string;
      endDate: string;
      includeComparisons: boolean | string;
    }>;

    const dateRange = getDateRange(period as string, startDate as string | undefined, endDate as string | undefined);

    // Her model için ayrı where ve createdAt filtresi
    const createdAtFilter: { gte?: Date; lte?: Date } = {};
    if (dateRange.gte) createdAtFilter.gte = dateRange.gte;
    if (dateRange.lte) createdAtFilter.lte = dateRange.lte;

    const userWhere: Prisma.UserWhereInput = {};
    const streamWhere: Prisma.LiveStreamWhereInput = {};
    const giftWhere: Prisma.GiftWhereInput = {};
    const commentWhere: Prisma.CommentWhereInput = {};

    if (createdAtFilter.gte || createdAtFilter.lte) {
      userWhere.createdAt = createdAtFilter;
      streamWhere.createdAt = createdAtFilter;
      giftWhere.createdAt = createdAtFilter;
      commentWhere.createdAt = createdAtFilter;
    }

    const [users, streams, gifts, commentsCount] = await Promise.all([
      prisma.user.findMany({ where: userWhere, select: { createdAt: true, lastLoginAt: true } }),
      prisma.liveStream.findMany({ where: streamWhere, select: { status: true, stats: true } }),
      prisma.gift.findMany({ where: giftWhere, select: { value: true, quantity: true } }),
      prisma.comment.count({ where: commentWhere }),
    ]);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Users
    const users_total = users.length;
    const users_active = users.filter(u => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime()) <= 7 * dayMs).length;
    const users_new24h = users.filter(u => (now - new Date(u.createdAt).getTime()) <= dayMs).length;

    // Streams
    const safeNum = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);
    const streams_total = streams.length;
    const streams_live = streams.filter(s => s.status === 'LIVE').length;
    let streams_totalWatchTime = 0;
    let streams_totalViewers = 0;
    for (const s of streams) {
      const stats = (s.stats as StreamStats) || {};
      streams_totalWatchTime += safeNum(stats.totalDuration);
      streams_totalViewers += safeNum(stats.totalViewers);
    }

    // Revenue (gifts üzerinden)
    const totalRevenue = gifts.reduce((sum, g) => sum + (g.value || 0) * Math.max(g.quantity || 1, 1), 0);

    const analytics = {
      users: {
        totalUsers: users_total,
        activeUsers: users_active,
        newUsers: users_new24h,
      },
      streams: {
        totalStreams: streams_total,
        liveStreams: streams_live,
        totalWatchTime: streams_totalWatchTime,
        totalViewers: streams_totalViewers,
      },
      revenue: {
        totalRevenue,
        totalTransactions: gifts.length,
      },
      engagement: {
        totalComments: commentsCount,
        totalGifts: gifts.length,
        totalReactions: 0, // Prisma'da ayrı Reaction modeli yok
      },
    };

    let comparisons: {
      users: { totalUsers: number; activeUsers: number; newUsers: number };
      streams: { totalStreams: number; liveStreams: number; totalWatchTime: number; totalViewers: number };
      revenue: { totalRevenue: number; totalTransactions: number };
      engagement: { totalComments: number; totalGifts: number; totalReactions: number };
      range: DateRange;
    } | null = null;

    const includeComp = includeComparisons === true || String(includeComparisons).toLowerCase() === 'true';
    if (includeComp) {
      const prevRange = shiftRangeBack(dateRange);

      const prevCreatedAtFilter: { gte?: Date; lte?: Date } = {};
      if (prevRange.gte) prevCreatedAtFilter.gte = prevRange.gte;
      if (prevRange.lte) prevCreatedAtFilter.lte = prevRange.lte;

      const prevUserWhere: Prisma.UserWhereInput = {};
      const prevStreamWhere: Prisma.LiveStreamWhereInput = {};
      const prevGiftWhere: Prisma.GiftWhereInput = {};
      const prevCommentWhere: Prisma.CommentWhereInput = {};

      if (prevCreatedAtFilter.gte || prevCreatedAtFilter.lte) {
        prevUserWhere.createdAt = prevCreatedAtFilter;
        prevStreamWhere.createdAt = prevCreatedAtFilter;
        prevGiftWhere.createdAt = prevCreatedAtFilter;
        prevCommentWhere.createdAt = prevCreatedAtFilter;
      }

      const [prevUsers, prevStreams, prevGifts, prevCommentsCount] = await Promise.all([
        prisma.user.findMany({ where: prevUserWhere, select: { createdAt: true, lastLoginAt: true } }),
        prisma.liveStream.findMany({ where: prevStreamWhere, select: { status: true, stats: true } }),
        prisma.gift.findMany({ where: prevGiftWhere, select: { value: true, quantity: true } }),
        prisma.comment.count({ where: prevCommentWhere }),
      ]);

      const prev_users_total = prevUsers.length;
      const prev_users_active = prevUsers.filter(u => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime()) <= 7 * dayMs).length;
      const prev_users_new24h = prevUsers.filter(u => (now - new Date(u.createdAt).getTime()) <= dayMs).length;

      const prev_streams_total = prevStreams.length;
      const prev_streams_live = prevStreams.filter(s => s.status === 'LIVE').length;
      let prev_streams_totalWatchTime = 0;
      let prev_streams_totalViewers = 0;
      for (const s of prevStreams) {
        const stats = (s.stats as StreamStats) || {};
        prev_streams_totalWatchTime += safeNum(stats.totalDuration);
        prev_streams_totalViewers += safeNum(stats.totalViewers);
      }

      const prev_totalRevenue = prevGifts.reduce((sum, g) => sum + (g.value || 0) * Math.max(g.quantity || 1, 1), 0);

      comparisons = {
        users: {
          totalUsers: prev_users_total,
          activeUsers: prev_users_active,
          newUsers: prev_users_new24h,
        },
        streams: {
          totalStreams: prev_streams_total,
          liveStreams: prev_streams_live,
          totalWatchTime: prev_streams_totalWatchTime,
          totalViewers: prev_streams_totalViewers,
        },
        revenue: {
          totalRevenue: prev_totalRevenue,
          totalTransactions: prevGifts.length,
        },
        engagement: {
          totalComments: prevCommentsCount,
          totalGifts: prevGifts.length,
          totalReactions: 0,
        },
        range: prevRange,
      };
    }

    return res.json({
      success: true,
      message: 'Platform analytics retrieved successfully',
      data: {
        analytics,
        comparisons,
        period,
        filters: { startDate: startDate || null, endDate: endDate || null },
      },
    });
  } catch (error: unknown) {
    console.error('Get platform analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve platform analytics' });
  }
}