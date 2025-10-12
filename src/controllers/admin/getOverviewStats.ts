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
  ]);

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
    },
  });
}