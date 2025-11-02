import { Response } from 'express';
import type { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { getLevelProgressForUser, calculateLevelFromXp, loadLevelSettings } from '@/services/levelService';
import { getSocketServer } from '@/sockets/socketRef';

export async function getMyLevelProgress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }

    const progress = await getLevelProgressForUser(userId);
    if (!progress) {
      res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      return;
    }

    const totalForLevel = progress.nextLevelXp - progress.currentLevelXp;
    const percent = totalForLevel > 0 ? Math.min(100, Math.round((progress.xpIntoLevel / totalForLevel) * 100)) : 100;

    res.status(200).json({
      success: true,
      data: {
        xp: progress.xp,
        level: progress.level,
        currentLevelXp: progress.currentLevelXp,
        nextLevelXp: progress.nextLevelXp,
        xpIntoLevel: progress.xpIntoLevel,
        nextLevelXpRequired: totalForLevel,
        progressPercentage: percent,
        isMaxLevel: progress.nextLevelXp === progress.currentLevelXp,
      },
    });
  } catch (err) {
    logger.error('getMyLevelProgress error', err);
    res.status(500).json({ success: false, message: 'Seviye bilgisi alınırken hata oluştu' });
  }
}

export async function addXp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }

    const amountRaw = req.body?.amount;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, message: 'Geçerli bir XP miktarı gerekli' });
      return;
    }

    let leveledUp = false;
    let newLevel = 0;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { xp: true, level: true } });
      if (!user) {
        throw new Error('User not found');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: amount } },
        select: { xp: true, level: true },
      });

      const calc = await calculateLevelFromXp(updated.xp);
      newLevel = calc.level;

      if (newLevel > (user.level ?? 1)) {
        leveledUp = true;
        await tx.user.update({ where: { id: userId }, data: { level: newLevel } });

        // Ödülleri uygula (ayarlar üzerinden)
        const settings = await loadLevelSettings();
        const reward = settings.levelRewards?.[String(newLevel)];
        const incDiamonds = Math.floor(Number(reward?.diamonds ?? 0));
        const incCoins = Math.floor(Number(reward?.coins ?? 0));
        if (incDiamonds > 0) {
          await tx.virtualBalance.update({ where: { userId }, data: { diamonds: { increment: incDiamonds } } });
          await tx.transaction.create({
            data: {
              reference: `level_reward_${userId}_L${newLevel}`,
              userId,
              type: 'TRANSFER',
              amount: incDiamonds,
              currency: 'DIAMOND',
              status: 'COMPLETED',
              description: `Level reward applied: L${newLevel}`,
              walletId: null,
              metadata: { levelReward: true, level: newLevel },
            },
          });
        }
        if (incCoins > 0) {
          await tx.virtualBalance.update({ where: { userId }, data: { coins: { increment: incCoins } } });
          await tx.transaction.create({
            data: {
              reference: `level_reward_${userId}_L${newLevel}`,
              userId,
              type: 'TRANSFER',
              amount: incCoins,
              currency: 'COIN',
              status: 'COMPLETED',
              description: `Level reward applied: L${newLevel}`,
              walletId: null,
              metadata: { levelReward: true, level: newLevel },
            },
          });
        }
      }

      return { xp: updated.xp, level: newLevel };
    });

    // Socket bildirimi (room: user:<id>)
    if (leveledUp) {
      const io = getSocketServer();
      io?.to(`user:${userId}`).emit('level_up', {
        userId,
        level: newLevel,
        source: 'manual_xp',
        amount,
        reason,
      });
    }

    const progress = await getLevelProgressForUser(userId);
    const totalForLevel = progress ? progress.nextLevelXp - progress.currentLevelXp : 0;
    const percent = progress && totalForLevel > 0 ? Math.min(100, Math.round((progress.xpIntoLevel / totalForLevel) * 100)) : 100;

    res.status(200).json({
      success: true,
      message: leveledUp ? 'XP eklendi ve seviye yükseltildi' : 'XP eklendi',
      data: {
        xp: result.xp,
        level: result.level,
        progress: progress
          ? {
              currentLevelXp: progress.currentLevelXp,
              nextLevelXp: progress.nextLevelXp,
              xpIntoLevel: progress.xpIntoLevel,
              nextLevelXpRequired: totalForLevel,
              progressPercentage: percent,
            }
          : null,
      },
    });
  } catch (err) {
    logger.error('addXp error', err);
    res.status(500).json({ success: false, message: 'XP eklenirken hata oluştu' });
  }
}

// Herkese açık: Belirli bir kullanıcının level ilerlemesini getir
export async function getUserLevelProgressPublic(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: userId } = req.params as { id?: string };
    if (!userId) {
      res.status(400).json({ success: false, message: 'Kullanıcı ID gereklidir' });
      return;
    }

    // Kullanıcı durumu kontrolü (banlı veya pasif kullanıcılar gizlenir)
    const userStatus = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, isBanned: true },
    });

    if (!userStatus || userStatus.isBanned || !userStatus.isActive) {
      res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      return;
    }

    const progress = await getLevelProgressForUser(userId);
    if (!progress) {
      res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      return;
    }

    const totalForLevel = progress.nextLevelXp - progress.currentLevelXp;
    const percent = totalForLevel > 0 ? Math.min(100, Math.round((progress.xpIntoLevel / totalForLevel) * 100)) : 100;

    res.status(200).json({
      success: true,
      data: {
        xp: progress.xp,
        level: progress.level,
        currentLevelXp: progress.currentLevelXp,
        nextLevelXp: progress.nextLevelXp,
        xpIntoLevel: progress.xpIntoLevel,
        nextLevelXpRequired: totalForLevel,
        progressPercentage: percent,
        isMaxLevel: progress.nextLevelXp === progress.currentLevelXp,
      },
    });
  } catch (err) {
    logger.error('getUserLevelProgressPublic error', err);
    res.status(500).json({ success: false, message: 'Seviye bilgisi alınırken hata oluştu' });
  }
}

// Herkese açık: Belirli bir kullanıcının sadece level ve xp bilgisini getir
export async function getUserLevelPublic(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: userId } = req.params as { id?: string };
    if (!userId) {
      res.status(400).json({ success: false, message: 'Kullanıcı ID gereklidir' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, isActive: true, isBanned: true },
    });

    if (!user || user.isBanned || !user.isActive) {
      res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        level: user.level,
        xp: user.xp,
      },
    });
  } catch (err) {
    logger.error('getUserLevelPublic error', err);
    res.status(500).json({ success: false, message: 'Kullanıcı seviyesi alınırken hata oluştu' });
  }
}