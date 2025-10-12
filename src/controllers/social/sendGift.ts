import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { getGiftConfig } from './helpers';

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

    // Hediye konfigürasyonu
    const giftConfig = getGiftConfig(giftType);
    if (!giftConfig) {
      res.status(400).json({ success: false, message: 'Geçersiz hediye türü' });
      return;
    }

    const totalCost = Number(giftConfig.value) * qtyNum;

    // prismaAny geçici çözümdü; artık tipli çağrılar kullanıyoruz
    // const prismaAny = prisma as any;

    // Gönderen cüzdanı
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
      select: { userId: true, balance: true },
    });
    if (!senderWallet) {
      res.status(400).json({ success: false, message: 'Gönderen cüzdanı bulunamadı' });
      return;
    }
    if (Number(senderWallet.balance) < totalCost) {
      res.status(400).json({ success: false, message: 'Yetersiz bakiye' });
      return;
    }

    // Alıcı cüzdanı
    const receiverWallet = await prisma.wallet.findUnique({
      where: { userId: receiverId },
      select: { userId: true, balance: true },
    });
    if (!receiverWallet) {
      res.status(400).json({ success: false, message: 'Alıcı cüzdanı bulunamadı' });
      return;
    }

    // Transaction: hediye oluştur + cüzdan güncelle
    const createdGift = await prisma.$transaction(async (tx) => {
      // const txAny = tx as any;

      const giftData = {
        senderId,
        receiverId,
        giftType,
        giftName: giftConfig.name,
        giftIcon: giftConfig.icon,
        giftAnimation: giftConfig.animation,
        value: Number(giftConfig.value),
        quantity: qtyNum,
        message: typeof message === 'string' ? message : null,
        isAnonymous: Boolean(isAnonymous),
        isPublic: Boolean(isPublic),
        metadata: {
          platform: 'web',
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null,
        },
        ...(streamId ? { streamId } : {}),
      };

      const gift = await tx.gift.create({ data: giftData });

      await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: { decrement: totalCost } },
      });

      await tx.wallet.update({
        where: { userId: receiverId },
        data: { balance: { increment: totalCost } },
      });

      return gift;
    });

    res.status(201).json({
      success: true,
      message: 'Hediye başarıyla gönderildi',
      data: createdGift,
    });
  } catch (error) {
    console.error('Send gift error:', error);
    res.status(500).json({ success: false, message: 'Hediye gönderilirken hata oluştu' });
  }
}