import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';


// Dar yerel tipler
interface StreamStats {
  totalViewers?: number;
  peakViewers?: number;
  currentViewers?: number;
  totalDuration?: number;
}

interface GiftItem {
  value: number | null;
  quantity: number | null;
}

interface AnalyticsEntry {
  _id: string | null;
  totalStreams: number;
  totalViewers: number;
  peakViewers: number;
  averageViewers: number;
  totalWatchTime: number;
  totalComments: number;
  totalGifts: number;
  totalGiftsValue: number;
  totalReactions: number;
  averageEngagementRate: number;
}

export async function getStreamsAnalytics(req: Request, res: Response): Promise<Response> {
  try {
    const {
      streamId,
      userId,
      period = 'daily',
      startDate,
      endDate,
      // timezone ve metrics kullanılmıyor; lint için çıkardık
      groupBy
    } = req.query as Partial<{
      streamId: string;
      userId: string;
      period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all' | string;
      startDate: string;
      endDate: string;
      groupBy: 'hour' | 'day' | 'week' | 'month' | 'year' | string;
    }>;

    const where: Prisma.LiveStreamWhereInput = {};
    if (streamId) where.id = String(streamId);
    if (userId) where.streamerId = String(userId);

    const now = new Date();
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    } else if (period !== 'all') {
      const periodMap: Record<'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly', number> = {
        hourly: 1 / 24,
        daily: 1,
        weekly: 7,
        monthly: 30,
        yearly: 365
      };
      const days = periodMap[(period as keyof typeof periodMap)] ?? 1;
      where.createdAt = { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
    }

    const streams = await prisma.liveStream.findMany({
      where,
      include: {
        comments: { select: { id: true } },
        gifts: { select: { value: true, quantity: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const toNumber = (v: unknown): number => {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : 0;
    };

    const calcMetrics = (s: {
      stats: unknown;
      comments: Array<{ id: string }>;
      gifts: GiftItem[];
    }): {
      totalViewers: number;
      peakViewers: number;
      currentViewers: number;
      totalDuration: number;
      totalComments: number;
      totalGifts: number;
      totalGiftsValue: number;
      totalReactions: number;
      engagementRate: number;
    } => {
      const stats = (s.stats as StreamStats) || {};
      const totalViewers = toNumber(stats.totalViewers);
      const peakViewers = toNumber(stats.peakViewers);
      const currentViewers = toNumber(stats.currentViewers);
      const totalDuration = toNumber(stats.totalDuration);

      const totalComments = s.comments.length;
      const totalGifts = s.gifts.length;
      const totalReactions = 0; // Prisma şemasında Reaction yok

      const totalGiftsValue = s.gifts.reduce((sum: number, g: GiftItem) => {
        const value = toNumber(g.value);
        const qty = toNumber(g.quantity) || 1;
        return sum + value * qty;
      }, 0);

      const engagementRate =
        totalViewers > 0 ? (totalComments + totalGifts + totalReactions) / totalViewers : 0;

      return {
        totalViewers,
        peakViewers,
        currentViewers,
        totalDuration,
        totalComments,
        totalGifts,
        totalGiftsValue,
        totalReactions,
        engagementRate
      };
    };

    let analyticsResults: AnalyticsEntry[] = [];

    if (groupBy) {
      const pad = (n: number): string => String(n).padStart(2, '0');
      const getISOWeek = (date: Date): { year: number; week: number } => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: weekNo };
      };
      const formatKey = (d: Date, g: 'hour' | 'day' | 'week' | 'month' | 'year' | string): string => {
        const date = new Date(d);
        switch (g) {
        case 'hour':
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:00`;
        case 'day':
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        case 'week': {
          const { year, week } = getISOWeek(date);
          return `${year}-W${pad(week)}`;
        }
        case 'month':
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
        case 'year':
          return `${date.getFullYear()}`;
        default:
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        }
      };

      type GroupAccumulator = {
        _id: string;
        totalStreams: number;
        totalViewers: number;
        peakViewers: number;
        averageViewersAccumulator: number;
        averageViewersCount: number;
        totalWatchTime: number;
        totalComments: number;
        totalGifts: number;
        totalGiftsValue: number;
        totalReactions: number;
        averageEngagementAccumulator: number;
        averageEngagementCount: number;
      };

      const groups = new Map<string, GroupAccumulator>();

      for (const s of streams) {
        const key = formatKey(s.createdAt, String(groupBy));
        const m = calcMetrics(s as unknown as { stats: unknown; comments: Array<{ id: string }>; gifts: GiftItem[] });

        let g = groups.get(key);
        if (!g) {
          g = {
            _id: key,
            totalStreams: 0,
            totalViewers: 0,
            peakViewers: 0,
            averageViewersAccumulator: 0,
            averageViewersCount: 0,
            totalWatchTime: 0,
            totalComments: 0,
            totalGifts: 0,
            totalGiftsValue: 0,
            totalReactions: 0,
            averageEngagementAccumulator: 0,
            averageEngagementCount: 0
          };
          groups.set(key, g);
        }

        g.totalStreams += 1;
        g.totalViewers += m.totalViewers;
        g.peakViewers = Math.max(g.peakViewers, m.peakViewers);
        g.averageViewersAccumulator += m.currentViewers;
        g.averageViewersCount += 1;
        g.totalWatchTime += m.totalDuration;
        g.totalComments += m.totalComments;
        g.totalGifts += m.totalGifts;
        g.totalGiftsValue += m.totalGiftsValue;
        g.totalReactions += m.totalReactions;
        g.averageEngagementAccumulator += m.engagementRate;
        g.averageEngagementCount += 1;
      }

      analyticsResults = Array.from(groups.values())
        .map((g): AnalyticsEntry => ({
          _id: g._id,
          totalStreams: g.totalStreams,
          totalViewers: g.totalViewers,
          peakViewers: g.peakViewers,
          averageViewers: g.averageViewersCount
            ? g.averageViewersAccumulator / g.averageViewersCount
            : 0,
          totalWatchTime: g.totalWatchTime,
          totalComments: g.totalComments,
          totalGifts: g.totalGifts,
          totalGiftsValue: g.totalGiftsValue,
          totalReactions: g.totalReactions,
          averageEngagementRate: g.averageEngagementCount
            ? g.averageEngagementAccumulator / g.averageEngagementCount
            : 0
        }))
        .sort((a: AnalyticsEntry, b: AnalyticsEntry) => ((a._id ?? '') > (b._id ?? '') ? 1 : -1));
    } else {
      const agg: Omit<AnalyticsEntry, 'averageViewers' | 'averageEngagementRate'> & {
        averageViewersAccumulator: number;
        averageViewersCount: number;
        averageEngagementAccumulator: number;
        averageEngagementCount: number;
      } = {
        _id: null,
        totalStreams: 0,
        totalViewers: 0,
        peakViewers: 0,
        averageViewersAccumulator: 0,
        averageViewersCount: 0,
        totalWatchTime: 0,
        totalComments: 0,
        totalGifts: 0,
        totalGiftsValue: 0,
        totalReactions: 0,
        averageEngagementAccumulator: 0,
        averageEngagementCount: 0
      };

      for (const s of streams) {
        const m = calcMetrics(s as unknown as { stats: unknown; comments: Array<{ id: string }>; gifts: GiftItem[] });
        agg.totalStreams += 1;
        agg.totalViewers += m.totalViewers;
        agg.peakViewers = Math.max(agg.peakViewers, m.peakViewers);
        agg.averageViewersAccumulator += m.currentViewers;
        agg.averageViewersCount += 1;
        agg.totalWatchTime += m.totalDuration;
        agg.totalComments += m.totalComments;
        agg.totalGifts += m.totalGifts;
        agg.totalGiftsValue += m.totalGiftsValue;
        agg.totalReactions += m.totalReactions;
        agg.averageEngagementAccumulator += m.engagementRate;
        agg.averageEngagementCount += 1;
      }

      analyticsResults = [
        {
          _id: null,
          totalStreams: agg.totalStreams,
          totalViewers: agg.totalViewers,
          peakViewers: agg.peakViewers,
          averageViewers: agg.averageViewersCount
            ? agg.averageViewersAccumulator / agg.averageViewersCount
            : 0,
          totalWatchTime: agg.totalWatchTime,
          totalComments: agg.totalComments,
          totalGifts: agg.totalGifts,
          totalGiftsValue: agg.totalGiftsValue,
          totalReactions: agg.totalReactions,
          averageEngagementRate: agg.averageEngagementCount
            ? agg.averageEngagementAccumulator / agg.averageEngagementCount
            : 0
        }
      ];
    }

    return res.json({
      success: true,
      message: 'Stream analytics retrieved successfully',
      data: {
        analytics: groupBy ? analyticsResults : analyticsResults[0] || {},
        period,
        groupBy,
        filters: { streamId, userId, startDate, endDate }
      }
    });
  } catch (error: unknown) {
    console.error('Get stream analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stream analytics' });
  }
}