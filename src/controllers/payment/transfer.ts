import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export const transfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toUserId, amount, description } = req.body;
    const fromUserId = req.user?.id;
    if (!fromUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (fromUserId === toUserId) {
      res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });
      return;
    }

    const [fromWallet, toWallet, toUser] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId: fromUserId } }),
      prisma.wallet.findUnique({ where: { userId: toUserId } }),
      prisma.user.findUnique({ where: { id: toUserId } }),
    ]);

    if (!fromWallet) {
      res.status(404).json({ success: false, message: 'Your wallet not found' });
      return;
    }
    if (!toUser) {
      res.status(404).json({ success: false, message: 'Recipient user not found' });
      return;
    }

    let recipientWallet = toWallet;
    if (!recipientWallet) {
      recipientWallet = await prisma.wallet.create({
        data: {
          userId: toUserId,
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          frozenBalance: 0,
          currency: 'TRY',
          security: { isLocked: false, requiresVerification: false, verificationLevel: 0 },
        },
      });
    }

    // Kontrol: gönderici bakiyesi yeterli mi?
    if (fromWallet.availableBalance < amount) {
      res.status(400).json({ success: false, message: 'Insufficient available balance' });
      return;
    }

    // Transaction ve bakiyeler (tek bir transfer kaydı)
    const reference = `TX-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: fromUserId },
        data: {
          balance: fromWallet.balance - amount,
          availableBalance: fromWallet.availableBalance - amount,
        },
      }),
      prisma.wallet.update({
        where: { userId: recipientWallet.userId },
        data: {
          balance: recipientWallet.balance + amount,
          availableBalance: recipientWallet.availableBalance + amount,
        },
      }),
      prisma.transaction.create({
        data: {
          userId: fromUserId,
          type: 'TRANSFER',
          amount,
          currency: fromWallet.currency,
          status: 'COMPLETED',
          description: description || 'Wallet transfer',
          reference,
        },
      }),
    ]);

    const updatedFrom = await prisma.wallet.findUnique({ where: { userId: fromUserId } });

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        fromWallet: {
          balance: updatedFrom?.balance ?? fromWallet.balance - amount,
          availableBalance: updatedFrom?.availableBalance ?? fromWallet.availableBalance - amount,
        },
        toUser: {
          id: toUser.id,
          username: toUser.username,
          displayName: toUser.displayName,
        },
        transfer: {
          amount,
          description: description || 'Wallet transfer',
          timestamp: new Date(),
        },
      },
    });
  } catch (error: unknown) {
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process transfer',
    });
  }
};