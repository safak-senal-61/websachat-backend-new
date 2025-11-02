// Top-level imports
import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { getGiftConfig } from './helpers';
import { calculateLevelFromXp } from '@/services/levelService';
import { getSocketServer } from '@/sockets/socketRef';
import type { GiftConfig } from './helpers';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export async function sendGift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      receiverId,
      streamId,
      giftType,
      quantity = 1,
      message,
      isAnonymous = false,
      isPublic = true,
    } = req.body;
    const senderId = req.user?.id;

    // Girdi doğrulama
    if (typeof senderId !== 'string' || !senderId.trim()) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }
    if (typeof receiverId !== 'string' || !receiverId.trim()) {
      res.status(400).json({ success: false, message: 'Geçersiz alıcı kimliği' });
      return;
    }
    if (typeof giftType !== 'string' || !giftType.trim()) {
      res.status(400).json({ success: false, message: 'Geçersiz hediye türü' });
      return;
    }
    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      res.status(400).json({ success: false, message: 'Geçersiz adet' });
      return;
    }

    // Alıcı kontrolü
    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
    if (!receiver) {
      res.status(404).json({ success: false, message: 'Alıcı bulunamadı' });
      return;
    }

    // Yayın kontrolü (varsa)
    if (streamId) {
      if (typeof streamId !== 'string' || !streamId.trim()) {
        res.status(400).json({ success: false, message: 'Geçersiz yayın kimliği' });
        return;
      }
      const stream = await prisma.liveStream.findUnique({
        where: { id: streamId },
        select: { id: true },
      });
      if (!stream) {
        res.status(404).json({ success: false, message: 'Yayın bulunamadı' });
        return;
      }
    }

    // Hediye konfigürasyonu (built-in + admin override)
    const baseGiftConfig = getGiftConfig(giftType);

    // Admin gift catalog
    const catalogSetting = await prisma.systemSetting.findUnique({ where: { key: 'gift_catalog' } });
    let catalog: Record<string, Partial<GiftConfig> & { bonusDiamonds?: number; bonusCoins?: number; badge?: string }> = {};
    const rawCatalog = catalogSetting?.value;
    if (typeof rawCatalog === 'string') {
      try {
        const parsed = JSON.parse(rawCatalog) as unknown;
        if (isRecord(parsed)) {
          catalog = parsed as Record<string, Partial<GiftConfig> & { bonusDiamonds?: number; bonusCoins?: number; badge?: string }>;
        }
      } catch {
        // parse hatası: boş katalog kullanılacak
      }
    } else if (isRecord(rawCatalog)) {
      catalog = rawCatalog as unknown as Record<string, Partial<GiftConfig> & { bonusDiamonds?: number; bonusCoins?: number; badge?: string }>;
    }

    const overrideRaw = catalog[giftType] || {};
    const overrideNormalized: Partial<GiftConfig> & { bonusDiamonds?: number; bonusCoins?: number; badge?: string } = { ...overrideRaw };
    // exactOptionalPropertyTypes uyumu için xp undefined ise kaldır
    if (overrideNormalized.xp === undefined) {
      delete overrideNormalized.xp;
    }
    // GiftConfig'a dahil olmayan bonus alanlarını ayır
    const { bonusDiamonds, bonusCoins, badge, ...overrideForGift } = overrideNormalized;

    const giftConfig: GiftConfig | undefined = baseGiftConfig
      ? { ...baseGiftConfig, ...overrideForGift }
      : (typeof overrideForGift.value === 'number'
        ? {
          name: overrideForGift.name ?? giftType,
          icon: overrideForGift.icon ?? '',
          value: Number(overrideForGift.value),
          animation: overrideForGift.animation ?? '',
          ...(overrideForGift.xp !== undefined ? { xp: Number(overrideForGift.xp) } : {}),
        }
        : undefined);

    if (!giftConfig || typeof giftConfig.value !== 'number') {
      res.status(400).json({ success: false, message: 'Geçersiz hediye türü veya yapılandırma' });
      return;
    }

    // Sistem ayarları: ekonomi ve seviye
    const [economySetting, levelSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'gift_economy' } }),
      prisma.systemSetting.findUnique({ where: { key: 'level_settings' } }),
    ]);

    type EconomySettings = { coin_kurus: number; commission_rate: number };
    let economy: EconomySettings = { coin_kurus: 5, commission_rate: 0.5 };
    const economyRaw = economySetting?.value;
    if (typeof economyRaw === 'string') {
      try {
        const parsed = JSON.parse(economyRaw) as unknown;
        if (isRecord(parsed)) {
          const p = parsed as Partial<EconomySettings>;
          economy = {
            coin_kurus: Number(p.coin_kurus ?? economy.coin_kurus),
            commission_rate: Number(p.commission_rate ?? economy.commission_rate),
          };
        }
      } catch {
        // parse hatası: varsayılanlar korunur
      }
    } else if (isRecord(economyRaw)) {
      const p = economyRaw as unknown as Partial<EconomySettings>;
      economy = {
        coin_kurus: Number(p.coin_kurus ?? economy.coin_kurus),
        commission_rate: Number(p.commission_rate ?? economy.commission_rate),
      };
    }

    type LevelSettingsCfg = {
      xp_per_gift?: number;
      xp_levels?: number[];
      levelRewards?: Record<string, { diamonds?: number; coins?: number }>;
    };
    let levelCfg: LevelSettingsCfg = { xp_per_gift: giftConfig.xp ?? 1, xp_levels: [0, 10, 25, 50, 100, 200] };
    const levelRaw = levelSetting?.value;
    if (typeof levelRaw === 'string') {
      try {
        const parsed = JSON.parse(levelRaw) as unknown;
        if (isRecord(parsed)) {
          const p = parsed as Partial<LevelSettingsCfg>;
          const incomingXpLevels = Array.isArray(p.xp_levels) ? p.xp_levels.map(Number) : undefined;
          const incomingRewards = p.levelRewards && typeof p.levelRewards === 'object' ? p.levelRewards : undefined;
          levelCfg = {
            xp_per_gift: Number(p.xp_per_gift ?? levelCfg.xp_per_gift),
            ...(incomingXpLevels ? { xp_levels: incomingXpLevels } : {}),
            ...(incomingRewards ? { levelRewards: incomingRewards } : {}),
          };
        }
      } catch {
        // varsayılanlar korunur
      }
    } else if (levelRaw && typeof levelRaw === 'object') {
      const p = levelRaw as Partial<LevelSettingsCfg>;
      const incomingXpLevels = Array.isArray(p.xp_levels) ? p.xp_levels.map(Number) : undefined;
      const incomingRewards = p.levelRewards && typeof p.levelRewards === 'object' ? p.levelRewards : undefined;
      levelCfg = {
        xp_per_gift: Number(p.xp_per_gift ?? levelCfg.xp_per_gift),
        ...(incomingXpLevels ? { xp_levels: incomingXpLevels } : {}),
        ...(incomingRewards ? { levelRewards: incomingRewards } : {}),
      };
    }

    const totalCoinsPerGift = Number(giftConfig.value);
    const totalCoins = totalCoinsPerGift * qtyNum;

    // Kurus hesaplama
    const totalKurus = totalCoins * Number(economy.coin_kurus);
    const appCommissionKurus = Math.floor(totalKurus * Number(economy.commission_rate));
    const receiverKurus = totalKurus - appCommissionKurus;

    // Diamonds (kuruş cinsinden saklanır, gösterimde TL'ye çevrilir)
    const diamondsAward = Math.floor(receiverKurus);

    // XP
    const xpAward = Number(levelCfg.xp_per_gift ?? (giftConfig.xp ?? 1)) * qtyNum;

    // Gönderen sanal bakiye (coin)
    const senderVB = await prisma.virtualBalance.findUnique({
      where: { userId: String(senderId) },
      select: { userId: true, coins: true },
    });
    if (!senderVB || Number(senderVB.coins) < totalCoins) {
      res.status(400).json({ success: false, message: 'Yetersiz jeton bakiyesi' });
      return;
    }

    // Alıcı sanal bakiye (elmas)
    const receiverVB = await prisma.virtualBalance.findUnique({
      where: { userId: receiverId },
      select: { userId: true, diamonds: true },
    });
    if (!receiverVB) {
      res.status(400).json({ success: false, message: 'Alıcı sanal bakiyesi bulunamadı' });
      return;
    }

    // Transaction: hediye oluştur + coin düş + diamonds ekle + commission kaydet + xp/level güncelle + bonus/rozet uygula
    let leveledUp = false;
    let leveledUpLevel = 0;
    const createdGift = await prisma.$transaction(async (tx) => {
      const giftData = {
        senderId,
        receiverId,
        giftType,
        giftName: giftConfig.name,
        giftIcon: giftConfig.icon,
        giftAnimation: giftConfig.animation,
        value: totalCoinsPerGift,
        quantity: qtyNum,
        message: typeof message === 'string' ? message : null,
        isAnonymous: Boolean(isAnonymous),
        isPublic: Boolean(isPublic),
        metadata: {
          platform: 'web',
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null,
          economy: { coin_kurus: economy.coin_kurus, commission_rate: economy.commission_rate },
          ...(badge ? { badge } : {}),
        },
        ...(streamId ? { streamId } : {}),
      };

      const gift = await tx.gift.create({ data: giftData });

      await tx.virtualBalance.update({
        where: { userId: String(senderId) },
        data: { coins: { decrement: totalCoins } },
      });
      await tx.virtualBalance.update({
        where: { userId: receiverId },
        data: { diamonds: { increment: diamondsAward } },
      });

      // Komisyon toplamını güncelle
      const commissionKey = 'commission_total_kurus';
      const existingCommission = await tx.systemSetting.findUnique({ where: { key: commissionKey } });
      if (!existingCommission) {
        await tx.systemSetting.create({ data: { key: commissionKey, value: { total: appCommissionKurus } } });
      } else {
        type CommissionTotal = { total: number };
        let current = 0;
        const v = existingCommission.value;
        if (typeof v === 'string') {
          try {
            const parsed = JSON.parse(v) as unknown;
            if (isRecord(parsed)) {
              const t = (parsed as CommissionTotal).total;
              current = typeof t === 'number' ? t : Number(t) || 0;
            }
          } catch {
            // parse hatası: current=0 kalır
          }
        } else if (isRecord(v)) {
          const t = (v as unknown as Partial<CommissionTotal>).total;
          current = typeof t === 'number' ? t : Number(t) || 0;
        }
        await tx.systemSetting.update({
          where: { key: commissionKey },
          data: { value: { total: current + appCommissionKurus } },
        });
      }

      // XP ve Seviye güncelle
      const user = await tx.user.update({
        where: { id: receiverId },
        data: { xp: { increment: xpAward } },
        select: { xp: true, level: true },
      });

      // Yeni seviyeyi LevelService üzerinden hesapla
      const calc = await calculateLevelFromXp(user.xp);
      const newLevel = calc.level;

      if (newLevel !== user.level) {
        leveledUp = true;
        leveledUpLevel = newLevel;
        await tx.user.update({ where: { id: receiverId }, data: { level: newLevel } });
        // Seviye ödüllerini uygula
        const reward = levelCfg.levelRewards?.[String(newLevel)];
        if (reward && typeof reward === 'object') {
          const incDiamonds = typeof reward.diamonds === 'number' ? Math.floor(Number(reward.diamonds)) : 0;
          const incCoins = typeof reward.coins === 'number' ? Math.floor(Number(reward.coins)) : 0;

          if (incDiamonds > 0) {
            await tx.virtualBalance.update({
              where: { userId: receiverId },
              data: { diamonds: { increment: incDiamonds } },
            });
          }
          if (incCoins > 0) {
            await tx.virtualBalance.update({
              where: { userId: receiverId },
              data: { coins: { increment: incCoins } },
            });
          }

          if (incDiamonds > 0 || incCoins > 0) {
            await tx.transaction.create({
              data: {
                reference: `level_reward_${receiverId}_L${newLevel}`,
                userId: receiverId,
                type: 'TRANSFER',
                amount: incDiamonds > 0 ? incDiamonds : incCoins,
                currency: incDiamonds > 0 ? 'DIAMOND' : 'COIN',
                status: 'COMPLETED',
                description: `Level reward applied: L${newLevel}`,
                walletId: null,
                metadata: { levelReward: true, level: newLevel },
              },
            });
          }
        }
      }

      // Hediye override bonusları ve rozet uygula
      const incBonusDiamonds = typeof bonusDiamonds === 'number' ? Math.floor(Number(bonusDiamonds)) : 0;
      const incBonusCoins = typeof bonusCoins === 'number' ? Math.floor(Number(bonusCoins)) : 0;

      if (incBonusDiamonds > 0) {
        await tx.virtualBalance.update({
          where: { userId: receiverId },
          data: { diamonds: { increment: incBonusDiamonds } },
        });
        await tx.transaction.create({
          data: {
            reference: `gift_bonus_${gift.id}_diamond`,
            userId: receiverId,
            type: 'TRANSFER',
            amount: incBonusDiamonds,
            currency: 'DIAMOND',
            status: 'COMPLETED',
            description: `Gift bonus diamonds applied (${giftType})`,
            walletId: null,
            metadata: { giftBonus: true, giftId: gift.id },
          },
        });
      }

      if (incBonusCoins > 0) {
        await tx.virtualBalance.update({
          where: { userId: receiverId },
          data: { coins: { increment: incBonusCoins } },
        });
        await tx.transaction.create({
          data: {
            reference: `gift_bonus_${gift.id}_coin`,
            userId: receiverId,
            type: 'TRANSFER',
            amount: incBonusCoins,
            currency: 'COIN',
            status: 'COMPLETED',
            description: `Gift bonus coins applied (${giftType})`,
            walletId: null,
            metadata: { giftBonus: true, giftId: gift.id },
          },
        });
      }

      // Rozet bilgisi varsa, hediye metadata'sında tutuluyor (giftData.metadata.badge)
      return gift;
    });

    // Level-up olduysa, hedef kullanıcının kişisel odasına bildirim gönder
    if (leveledUp) {
      const io = getSocketServer();
      io?.to(`user:${receiverId}`).emit('level_up', {
        userId: receiverId,
        level: leveledUpLevel,
        source: 'gift',
        giftType,
        quantity: qtyNum,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hediye başarıyla gönderildi',
      data: createdGift,
    });
  } catch (error) {
    console.error('Send gift error:', error);
    res.status(500).json({ success: false, message: 'Hediye gönderilirken hata oluştu' });
  }
}