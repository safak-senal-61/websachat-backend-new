import type { Response } from 'express';
import type { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { calculateLevelFromXp, loadLevelSettings } from '@/services/levelService';

export async function listUserAchievements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: userId } = req.params as { id?: string };
    if (!userId) {
      res.status(400).json({ success: false, message: 'Kullanıcı ID gereklidir' });
      return;
    }

    const userStatus = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, isBanned: true },
    });
    if (!userStatus || userStatus.isBanned || !userStatus.isActive) {
      res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      return;
    }

    const list = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: [{ earnedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    const achievements = list.map(item => ({
      code: item.achievement.code,
      title: item.achievement.title,
      description: item.achievement.description ?? undefined,
      iconUrl: item.achievement.iconUrl ?? undefined,
      xpReward: item.achievement.xpReward,
      progress: item.progress,
      earnedAt: item.earnedAt ?? undefined,
    }));

    res.status(200).json({ success: true, data: { achievements } });
  } catch (err) {
    logger.error('listUserAchievements error', err);
    res.status(500).json({ success: false, message: 'Başarımlar listelenirken hata oluştu' });
  }
}

export async function grantAchievement(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Yetki, route seviyesinde authorize('admin') ile sağlanır
    const { userId, achievementCode } = req.body as { userId?: string; achievementCode?: string };
    if (!userId || !achievementCode) {
      res.status(400).json({ success: false, message: 'userId ve achievementCode gereklidir' });
      return;
    }

    const achievement = await prisma.achievement.findUnique({ where: { code: achievementCode } });
    if (!achievement) {
      res.status(404).json({ success: false, message: 'Achievement bulunamadı' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const ua = await tx.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
        update: { progress: 100, earnedAt: new Date() },
        create: { userId, achievementId: achievement.id, progress: 100, earnedAt: new Date() },
      });

      // XP ödülünü ver ve gerekirse seviye artır
      const updated = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: achievement.xpReward } },
        select: { xp: true, level: true },
      });

      const calc = await calculateLevelFromXp(updated.xp);
      if (calc.level > (updated.level ?? 1)) {
        await tx.user.update({ where: { id: userId }, data: { level: calc.level } });

        const settings = await loadLevelSettings();
        const reward = settings.levelRewards?.[String(calc.level)];
        const incDiamonds = Math.floor(Number(reward?.diamonds ?? 0));
        const incCoins = Math.floor(Number(reward?.coins ?? 0));
        if (incDiamonds > 0) {
          await tx.virtualBalance.update({ where: { userId }, data: { diamonds: { increment: incDiamonds } } });
          await tx.transaction.create({
            data: {
              reference: `level_reward_${userId}_L${calc.level}`,
              userId,
              type: 'TRANSFER',
              amount: incDiamonds,
              currency: 'DIAMOND',
              status: 'COMPLETED',
              description: `Level reward applied: L${calc.level}`,
              walletId: null,
              metadata: { levelReward: true, level: calc.level },
            },
          });
        }
        if (incCoins > 0) {
          await tx.virtualBalance.update({ where: { userId }, data: { coins: { increment: incCoins } } });
          await tx.transaction.create({
            data: {
              reference: `level_reward_${userId}_L${calc.level}`,
              userId,
              type: 'TRANSFER',
              amount: incCoins,
              currency: 'COIN',
              status: 'COMPLETED',
              description: `Level reward applied: L${calc.level}`,
              walletId: null,
              metadata: { levelReward: true, level: calc.level },
            },
          });
        }
      }

      return { ua, xp: updated.xp, level: calc.level };
    });

    res.status(200).json({
      success: true,
      message: 'Achievement verildi',
      data: {
        userId,
        achievementCode,
        xp: result.xp,
        level: result.level,
      },
    });
  } catch (err) {
    logger.error('grantAchievement error', err);
    res.status(500).json({ success: false, message: 'Achievement verilirken hata oluştu' });
  }
}