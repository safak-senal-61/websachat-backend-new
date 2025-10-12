import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export const withdraw = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethod, description } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      res.status(404).json({ success: false, message: 'Wallet not found' });
      return;
    }

    interface WalletSecurity {
      isLocked?: boolean;
      requiresVerification?: boolean;
      verificationLevel?: number;
    }
    const security = (wallet.security ?? {}) as WalletSecurity;
    const isLocked = security.isLocked === true;
    if (isLocked) {
      res.status(403).json({ success: false, message: 'Wallet is locked. Please contact support.' });
      return;
    }

    // canWithdraw: min/max ve availableBalance kontrolü
    const minOk = amount >= (wallet.minimumWithdrawAmount ?? 0);
    const maxOk = wallet.maximumWithdrawAmount ? amount <= wallet.maximumWithdrawAmount : true;
    const balanceOk = wallet.availableBalance >= amount;
    if (!minOk || !maxOk || !balanceOk) {
      res.status(400).json({ success: false, message: 'Withdrawal not allowed. Check limits and balance.' });
      return;
    }

    // Limits: daily & monthly totals
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailyAgg, monthlyAgg] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'WITHDRAW',
          status: { in: ['COMPLETED', 'PROCESSING'] },
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'WITHDRAW',
          status: { in: ['COMPLETED', 'PROCESSING'] },
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    const dailyTotal = dailyAgg._sum.amount ?? 0;
    const monthlyTotal = monthlyAgg._sum.amount ?? 0;

    if (wallet.dailyWithdrawLimit && dailyTotal + amount > wallet.dailyWithdrawLimit) {
      res.status(400).json({
        success: false,
        message: `Daily withdrawal limit exceeded. Limit: ${wallet.dailyWithdrawLimit}, Used: ${dailyTotal}`,
      });
      return;
    }

    if (wallet.monthlyWithdrawLimit && monthlyTotal + amount > wallet.monthlyWithdrawLimit) {
      res.status(400).json({
        success: false,
        message: `Monthly withdrawal limit exceeded. Limit: ${wallet.monthlyWithdrawLimit}, Used: ${monthlyTotal}`,
      });
      return;
    }

    // Deduct available, add pending and create transaction in 'PENDING'
    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: {
        availableBalance: wallet.availableBalance - amount,
        pendingBalance: wallet.pendingBalance + amount,
      },
    });

    const reference = `TX-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'WITHDRAW',
        amount,
        currency: wallet.currency,
        status: 'PENDING',
        description: description || 'Wallet withdrawal',
        paymentMethodType: paymentMethod?.type || null,
        paymentMethod: paymentMethod || null,
        reference,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        transaction: {
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          createdAt: tx.createdAt,
        },
        wallet: {
          balance: updatedWallet.balance,
          availableBalance: updatedWallet.availableBalance,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Withdrawal error:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process withdrawal',
    });
  }
};