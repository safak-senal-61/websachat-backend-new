import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export const moderateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { transactionId } = req.params as { transactionId: string };
  const { action, reason } = req.body;
  const adminId = req.user?.id;
  if (!adminId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) {
    res.status(404).json({ success: false, message: 'Transaction not found' });
    return;
  }

  if (!['PENDING', 'PROCESSING'].includes(transaction.status)) {
    res.status(400).json({ success: false, message: 'Transaction cannot be moderated in current status' });
    return;
  }

  switch (action) {
  case 'approve': {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'COMPLETED' },
    });

    if (transaction.type === 'DEPOSIT') {
      const wallet = await prisma.wallet.findUnique({ where: { userId: transaction.userId } });
      if (wallet) {
        await prisma.wallet.update({
          where: { userId: transaction.userId },
          data: {
            balance: wallet.balance + transaction.amount,
            availableBalance: wallet.availableBalance + transaction.amount,
          },
        });
      }
    }

    if (transaction.type === 'WITHDRAW') {
      const wallet = await prisma.wallet.findUnique({ where: { userId: transaction.userId } });
      if (wallet) {
        await prisma.wallet.update({
          where: { userId: transaction.userId },
          data: {
            pendingBalance: Math.max(0, wallet.pendingBalance - transaction.amount),
          },
        });
      }
    }
    break;
  }
  case 'reject': {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED', adminNotes: reason || 'Rejected by admin' },
    });

    if (transaction.type === 'WITHDRAW') {
      const wallet = await prisma.wallet.findUnique({ where: { userId: transaction.userId } });
      if (wallet) {
        await prisma.wallet.update({
          where: { userId: transaction.userId },
          data: {
            pendingBalance: Math.max(0, wallet.pendingBalance - transaction.amount),
            availableBalance: wallet.availableBalance + transaction.amount,
          },
        });
      }
    }
    break;
  }
  default:
    res.status(400).json({ success: false, message: 'Invalid action. Use "approve" or "reject"' });
    return;
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      reviewedById: adminId,
      reviewedAt: new Date(),
      adminNotes: reason || undefined,
    },
  });

  res.status(200).json({
    success: true,
    message: `Transaction ${action}d successfully`,
    data: {
      transaction: {
        id: updated.id,
        reference: updated.reference,
        status: updated.status,
        reviewedBy: adminId,
        reviewedAt: updated.reviewedAt,
        adminNotes: updated.adminNotes,
      },
    },
  });
};