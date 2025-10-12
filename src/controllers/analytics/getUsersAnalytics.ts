import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export async function getUsersAnalytics(req: Request, res: Response): Promise<Response> {
  try {
    const {
      userId,
      period = 'monthly',
      startDate,
      endDate,
      userType = 'all',
      groupBy
    } = req.query as {
      userId?: string;
      period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
      startDate?: string;
      endDate?: string;
      userType?: 'all' | 'streamer' | 'user';
      groupBy?: 'day' | 'week' | 'month' | 'year';
    };

    // Tarih aralığı
    const now = new Date();
    const periodMap: Record<'daily' | 'weekly' | 'monthly' | 'yearly', number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365
    };
    const days = period !== 'all' ? (periodMap[period] ?? 30) : undefined;

    const rangeStart = startDate
      ? new Date(String(startDate))
      : days
        ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        : undefined;
    const rangeEnd = endDate ? new Date(String(endDate)) : undefined;

    // Kullanıcı filtresi
    const userWhere: Prisma.UserWhereInput = {};
    if (userId) userWhere.id = String(userId);
    if (rangeStart || rangeEnd) {
      userWhere.createdAt = {};
      if (rangeStart) userWhere.createdAt.gte = rangeStart;
      if (rangeEnd) userWhere.createdAt.lte = rangeEnd;
    }

    // userType: Prisma'da role yok -> streams ilişkisine göre tahmini filtre
    if (String(userType) === 'streamer') {
      userWhere.streams = { some: {} };
    } else if (String(userType) === 'user') {
      userWhere.streams = { none: {} };
    }

    // İlişkiler için tarih filtresi (streams/comments/gifts)
    const relationDateWhere: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (rangeStart || rangeEnd) {
      relationDateWhere.createdAt = {};
      if (rangeStart) relationDateWhere.createdAt.gte = rangeStart;
      if (rangeEnd) relationDateWhere.createdAt.lte = rangeEnd;
    }

    // Kullanıcıları ilişkileriyle getir
    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        streams: {
          where: relationDateWhere,
          select: { id: true, createdAt: true }
        },
        comments: {
          where: relationDateWhere,
          select: { id: true, createdAt: true }
        },
        sentGifts: {
          where: relationDateWhere,
          select: { value: true, quantity: true, createdAt: true }
        },
        receivedGifts: {
          where: relationDateWhere,
          select: { value: true, quantity: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const toNumber = (v: unknown): number => {
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    type GiftSummary = { value: number; quantity: number; createdAt: Date };
    type StreamSummary = { id: string; createdAt: Date };
    type CommentSummary = { id: string; createdAt: Date };

    type UserMetrics = {
      totalStreams: number;
      totalComments: number;
      totalGiftsSent: number;
      totalGiftsReceived: number;
      giftsSentValue: number;
      giftsReceivedValue: number;
    };

    const calcUserMetrics = (u: {
      streams: StreamSummary[];
      comments: CommentSummary[];
      sentGifts: GiftSummary[];
      receivedGifts: GiftSummary[];
    }): UserMetrics => {
      const totalStreams = u.streams.length;
      const totalComments = u.comments.length;
      const totalGiftsSent = u.sentGifts.length;
      const totalGiftsReceived = u.receivedGifts.length;

      const giftsSentValue = u.sentGifts.reduce((sum: number, g: GiftSummary) => {
        const val = toNumber(g.value);
        const qty = toNumber(g.quantity) || 1;
        return sum + val * qty;
      }, 0);

      const giftsReceivedValue = u.receivedGifts.reduce((sum: number, g: GiftSummary) => {
        const val = toNumber(g.value);
        const qty = toNumber(g.quantity) || 1;
        return sum + val * qty;
      }, 0);

      return {
        totalStreams,
        totalComments,
        totalGiftsSent,
        totalGiftsReceived,
        giftsSentValue,
        giftsReceivedValue
      };
    };

    type BaseAnalytics = {
      totalUsers: number;
      activeUsers: number;
      newUsers: number;
      totalStreams: number;
      totalComments: number;
      totalGiftsSent: number;
      totalGiftsReceived: number;
      totalGiftsSentValue: number;
      totalGiftsReceivedValue: number;
    };
    type GroupedAnalytics = BaseAnalytics & { _id: string };
    type AggregatedAnalytics = BaseAnalytics & { _id: null };

    let analyticsResults: (GroupedAnalytics | AggregatedAnalytics)[] = [];

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
      const formatKey = (d: Date, g: 'day' | 'week' | 'month' | 'year'): string => {
        const date = new Date(d);
        switch (g) {
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

      const groups: Record<string, GroupedAnalytics> = {};

      for (const u of users) {
        const key = formatKey(u.createdAt, String(groupBy) as 'day' | 'week' | 'month' | 'year');
        const m = calcUserMetrics(u);

        if (!groups[key]) {
          groups[key] = {
            _id: key,
            totalUsers: 0,
            activeUsers: 0,
            newUsers: 0,
            totalStreams: 0,
            totalComments: 0,
            totalGiftsSent: 0,
            totalGiftsReceived: 0,
            totalGiftsSentValue: 0,
            totalGiftsReceivedValue: 0
          };
        }

        const g = groups[key];
        g.totalUsers += 1;
        const lastLoginAt = u.lastLoginAt ? new Date(u.lastLoginAt) : undefined;
        if (lastLoginAt && lastLoginAt.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000) {
          g.activeUsers += 1;
        }
        if (new Date(u.createdAt).getTime() >= now.getTime() - 24 * 60 * 60 * 1000) {
          g.newUsers += 1;
        }
        g.totalStreams += m.totalStreams;
        g.totalComments += m.totalComments;
        g.totalGiftsSent += m.totalGiftsSent;
        g.totalGiftsReceived += m.totalGiftsReceived;
        g.totalGiftsSentValue += m.giftsSentValue;
        g.totalGiftsReceivedValue += m.giftsReceivedValue;
      }

      analyticsResults = Object.values(groups)
        .map((g: GroupedAnalytics) => ({
          _id: g._id,
          totalUsers: g.totalUsers,
          activeUsers: g.activeUsers,
          newUsers: g.newUsers,
          totalStreams: g.totalStreams,
          totalComments: g.totalComments,
          totalGiftsSent: g.totalGiftsSent,
          totalGiftsReceived: g.totalGiftsReceived,
          totalGiftsSentValue: g.totalGiftsSentValue,
          totalGiftsReceivedValue: g.totalGiftsReceivedValue
        }))
        .sort((a: GroupedAnalytics, b: GroupedAnalytics): number => (a._id > b._id ? 1 : -1));
    } else {
      const agg: AggregatedAnalytics = {
        _id: null,
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        totalStreams: 0,
        totalComments: 0,
        totalGiftsSent: 0,
        totalGiftsReceived: 0,
        totalGiftsSentValue: 0,
        totalGiftsReceivedValue: 0
      };

      for (const u of users) {
        const m = calcUserMetrics(u);
        agg.totalUsers += 1;
        const lastLoginAt = u.lastLoginAt ? new Date(u.lastLoginAt) : undefined;
        if (lastLoginAt && lastLoginAt.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000) {
          agg.activeUsers += 1;
        }
        if (new Date(u.createdAt).getTime() >= now.getTime() - 24 * 60 * 60 * 1000) {
          agg.newUsers += 1;
        }
        agg.totalStreams += m.totalStreams;
        agg.totalComments += m.totalComments;
        agg.totalGiftsSent += m.totalGiftsSent;
        agg.totalGiftsReceived += m.totalGiftsReceived;
        agg.totalGiftsSentValue += m.giftsSentValue;
        agg.totalGiftsReceivedValue += m.giftsReceivedValue;
      }

      analyticsResults = [agg];
    }

    return res.json({
      success: true,
      message: 'User analytics retrieved successfully',
      data: {
        analytics: groupBy ? analyticsResults : analyticsResults[0] || {},
        period,
        groupBy,
        filters: { userId, userType, startDate, endDate }
      }
    });
  } catch (error: unknown) {
    console.error('Get user analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user analytics' });
  }
}