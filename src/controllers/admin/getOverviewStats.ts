import { Request, Response } from 'express';
import { prisma } from '@/config/database';

export async function getOverviewStats(req: Request, res: Response): Promise<void> {
  const [
    usersCount,
    activeUsersCount,
    bannedUsersCount,
    liveStreamsCount,
    scheduledStreamsCount,
    endedStreamsCount,
    commentsCount,
    giftsCount,
    reportsPendingCount,
    reportsReviewedCount,
    bansActiveCount,
    transactionsCount,
    commissionSetting,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.liveStream.count({ where: { status: 'LIVE' } }),
    prisma.liveStream.count({ where: { status: 'SCHEDULED' } }),
    prisma.liveStream.count({ where: { status: 'ENDED' } }),
    prisma.comment.count(),
    prisma.gift.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.report.count({ where: { status: 'REVIEWED' } }),
    prisma.ban.count({ where: { isActive: true } }),
    prisma.transaction.count(),
    prisma.systemSetting.findUnique({ where: { key: 'commission_total_kurus' } }),
  ]);

  const rawCommission = commissionSetting?.value;
  let commissionTotalKurus = 0;
  if (typeof rawCommission === 'number') {
    commissionTotalKurus = Math.floor(rawCommission);
  } else if (typeof rawCommission === 'string') {
    const numeric = parseInt(rawCommission, 10);
    if (!Number.isNaN(numeric)) {
      commissionTotalKurus = numeric;
    } else {
      try {
        const parsedObj = JSON.parse(rawCommission) as unknown;
        if (parsedObj && typeof parsedObj === 'object' && 'total' in parsedObj) {
          const totalVal = (parsedObj as { total?: unknown }).total;
          if (typeof totalVal === 'number') {
            commissionTotalKurus = Math.floor(totalVal);
          }
        }
      } catch {
        // yoksay
      }
    }
  } else if (rawCommission && typeof rawCommission === 'object') {
    const totalVal = (rawCommission as { total?: unknown }).total;
    if (typeof totalVal === 'number') {
      commissionTotalKurus = Math.floor(totalVal);
    }
  }

  res.json({
    success: true,
    data: {
      users: { total: usersCount, active: activeUsersCount, banned: bannedUsersCount },
      streams: { live: liveStreamsCount, scheduled: scheduledStreamsCount, ended: endedStreamsCount },
      comments: { total: commentsCount },
      gifts: { total: giftsCount },
      reports: { pending: reportsPendingCount, reviewed: reportsReviewedCount },
      bans: { active: bansActiveCount },
      transactions: { total: transactionsCount },
      commission: { totalKurus: commissionTotalKurus },
    },
  });
}