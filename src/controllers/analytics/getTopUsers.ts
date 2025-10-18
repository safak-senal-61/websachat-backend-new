import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';
import { kurusToTL } from '@/utils/currency';

export async function getTopUsers(req: Request, res: Response): Promise<void> {
  try {
    const {
      period = 'monthly',
      startDate,
      endDate,
      userType = 'streamers',
      sortBy = 'revenue',
      limit = 10,
      page = 1
    } = req.query as {
      period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
      startDate?: string;
      endDate?: string;
      userType?: 'streamers' | 'gifters' | 'all';
      sortBy?: 'revenue' | 'gifts_sent' | 'gifts_received' | 'followers' | 'following';
      limit?: string | number;
      page?: string | number;
    };

    // Tarih aralığı belirleme
    const now = new Date();
    const periodMap: Record<'daily' | 'weekly' | 'monthly' | 'yearly', number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365
    };
    const days = period !== 'all' ? (periodMap[period as keyof typeof periodMap] ?? 30) : undefined;

    const rangeStart = startDate
      ? new Date(String(startDate))
      : days
        ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        : undefined;
    const rangeEnd = endDate ? new Date(String(endDate)) : undefined;

    // Kullanıcılar için filtre
    const userWhere: Prisma.UserWhereInput = {
      ...(rangeStart || rangeEnd
        ? { createdAt: { ...(rangeStart ? { gte: rangeStart } : {}), ...(rangeEnd ? { lte: rangeEnd } : {}) } }
        : {}),
      ...(String(userType) === 'streamers' ? { streams: { some: {} } } : {}),
    };

    // Hediyeler için tarih filtresi (period/startDate/endDate ile aynı aralık)
    const giftWhere: Prisma.GiftWhereInput = {
      ...(rangeStart || rangeEnd
        ? { createdAt: { ...(rangeStart ? { gte: rangeStart } : {}), ...(rangeEnd ? { lte: rangeEnd } : {}) } }
        : {}),
    };

    // Kullanıcıları hediyeler ve yayınlar ile birlikte getir
    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        streams: { select: { id: true } },
        sentGifts: {
          where: giftWhere,
          select: { value: true, quantity: true }
        },
        receivedGifts: {
          where: giftWhere,
          select: { value: true, quantity: true }
        }
      },
      orderBy: { createdAt: 'asc' } // sıralama metrik bazlı in-memory yapılacak
    });

    // Gift economy (coin_kurus) ayarını yükle
    const economySetting = await prisma.systemSetting.findUnique({
      where: { key: 'gift_economy' },
      select: { value: true },
    });
    let coinKurus = 100;
    if (economySetting?.value) {
      try {
        const parsed = JSON.parse(String(economySetting.value));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const ck = (parsed as Record<string, unknown>)['coin_kurus'];
          if (typeof ck === 'number') {
            coinKurus = ck;
          }
        }
      } catch {
        // parse hatasını yoksay, varsayılan coinKurus değeri (100) ile devam et
      }
    }

    // String/number/bigint değerleri güvenli sayıya çeviren yardımcı
    const toNumber = (v: unknown): number => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    type TopUserMetrics = {
      id: string;
      username?: string | null;
      displayName?: string | null;
      avatar?: string | null;
      totalStreams: number;
      totalSentGifts: number;
      totalReceivedGifts: number;
      totalSentGiftsValue: number; // coins
      totalReceivedGiftsValue: number; // coins
      totalSentKurus: number;
      totalReceivedKurus: number;
      totalSentTL: string;
      totalReceivedTL: string;
      followers: number;
      following: number;
    };

    const computed: TopUserMetrics[] = users.map((u) => {
      const totalStreams = u.streams.length;

      const totalSentGifts = u.sentGifts.length;
      const totalReceivedGifts = u.receivedGifts.length;

      const totalSentGiftsValue = u.sentGifts.reduce((sum, g) => {
        const value = toNumber(g.value);
        const qty = toNumber(g.quantity) || 1;
        return sum + value * qty;
      }, 0);

      const totalReceivedGiftsValue = u.receivedGifts.reduce((sum, g) => {
        const value = toNumber(g.value);
        const qty = toNumber(g.quantity) || 1;
        return sum + value * qty;
      }, 0);

      const totalSentKurus = Math.floor(totalSentGiftsValue * Number(coinKurus));
      const totalReceivedKurus = Math.floor(totalReceivedGiftsValue * Number(coinKurus));
      const totalSentTL = kurusToTL(totalSentKurus);
      const totalReceivedTL = kurusToTL(totalReceivedKurus);

      // stats JSON'dan followers/following okuma (any kullanılmadan)
      let followers = 0;
      let following = 0;
      const statsObj = (u as { stats?: Record<string, unknown> | null }).stats ?? {};
      if (statsObj && typeof statsObj === 'object') {
        followers = toNumber(statsObj['followers']);
        following = toNumber(statsObj['following']);
      }

      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        totalStreams,
        totalSentGifts,
        totalReceivedGifts,
        totalSentGiftsValue,
        totalReceivedGiftsValue,
        totalSentKurus,
        totalReceivedKurus,
        totalSentTL,
        totalReceivedTL,
        followers,
        following
      };
    });

    // Sıralama alanı seçimi - her zaman atanacak şekilde kesinleştirilmiş
    const isGifters = String(userType) === 'gifters';
    let sortFn: (x: TopUserMetrics) => number;

    switch (String(sortBy)) {
    case 'gifts_sent':
      sortFn = (x: TopUserMetrics): number => x.totalSentGifts;
      break;
    case 'gifts_received':
      sortFn = (x: TopUserMetrics): number => x.totalReceivedGifts;
      break;
    case 'followers':
      sortFn = (x: TopUserMetrics): number => x.followers;
      break;
    case 'following':
      sortFn = (x: TopUserMetrics): number => x.following;
      break;
    case 'revenue':
    default:
      sortFn = (x: TopUserMetrics): number =>
        (isGifters ? x.totalSentGiftsValue : x.totalReceivedGiftsValue);
      break;
    }

    // Sıralama (desc)
    computed.sort((a, b) => sortFn(b) - sortFn(a));

    // Sayfalama
    const pageNum = typeof page === 'string' ? parseInt(page, 10) || 1 : Number(page) || 1;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) || 10 : Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const paged = computed.slice(skip, skip + limitNum);

    res.json({
      success: true,
      message: 'Top users retrieved successfully',
      data: {
        users: paged,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: computed.length,
          pages: Math.ceil(computed.length / limitNum),
          hasNext: skip + limitNum < computed.length,
          hasPrev: pageNum > 1
        },
        filters: { period, userType, sortBy, startDate, endDate }
      }
    });
  } catch (error: unknown) {
    console.error('Get top users error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve top users' });
  }
}