import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export const getWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Removed unused 'db' to satisfy lint rules

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: { select: { username: true, displayName: true, avatar: true } },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          frozenBalance: 0,
          currency: 'TRY',
          security: { isLocked: false, requiresVerification: false, verificationLevel: 0 },
        },
        include: {
          user: { select: { username: true, displayName: true, avatar: true } },
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Wallet details retrieved successfully',
      data: {
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          frozenBalance: wallet.frozenBalance,
          currency: wallet.currency,
          limits: {
            dailyWithdrawLimit: wallet.dailyWithdrawLimit,
            monthlyWithdrawLimit: wallet.monthlyWithdrawLimit,
            minimumWithdrawAmount: wallet.minimumWithdrawAmount,
            maximumWithdrawAmount: wallet.maximumWithdrawAmount,
          },
          withdrawalSettings: wallet.withdrawalSettings,
          stats: wallet.stats,
          security: wallet.security,
          user: wallet.user,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get wallet details',
    });
  }
};