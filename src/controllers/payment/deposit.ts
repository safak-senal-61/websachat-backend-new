import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { processPayment } from './helpers';
import type { $Enums } from '../../generated/prisma';

export const deposit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, currency = 'TRY', paymentMethod, description } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          frozenBalance: 0,
          currency: currency,
          security: { isLocked: false, requiresVerification: false, verificationLevel: 0 },
        },
      });
    }
    interface WalletSecurity {
      isLocked?: boolean;
      requiresVerification?: boolean;
      verificationLevel?: number;
    }
    const security = (wallet.security ?? {}) as WalletSecurity;
    const isLocked = security.isLocked === true;
    if (isLocked) {
      res.status(403).json({
        success: false,
        message: 'Wallet is locked. Please contact support.',
      });
      return;
    }
    // Create transaction
    const reference = `TX-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT' as $Enums.TransactionType,
        amount,
        currency,
        status: 'PENDING' as $Enums.TransactionStatus,
        description: description || 'Wallet deposit',
        paymentMethodType: paymentMethod?.type || null,
        paymentMethod: paymentMethod || null,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          platform: req.get('X-Platform') || 'web',
        },
        reference,
      },
    });
    // Simulate payment processing
    await processPayment(prisma, tx.id, paymentMethod);
    // Reload transaction
    const updatedTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
    // If payment is successful, update wallet
    if (updatedTx?.status === 'COMPLETED') {
      wallet = await prisma.wallet.update({
        where: { userId },
        data: {
          balance: wallet.balance + amount,
          availableBalance: wallet.availableBalance + amount,
        },
      });
    }
    res.status(201).json({
      success: true,
      message: 'Deposit initiated successfully',
      data: {
        transaction: {
          id: updatedTx?.id,
          reference: updatedTx?.reference,
          amount: updatedTx?.amount,
          currency: updatedTx?.currency,
          status: updatedTx?.status,
          createdAt: updatedTx?.createdAt,
        },
        wallet: {
          balance: wallet.balance,
          availableBalance: wallet.availableBalance,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Deposit error:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process deposit',
    });
  }
};