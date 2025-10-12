import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { Prisma } from '../../generated/prisma';

export const updateWalletSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { withdrawalSettings, dailyWithdrawLimit, monthlyWithdrawLimit } = req.body as {
    withdrawalSettings?: Prisma.InputJsonValue;
    dailyWithdrawLimit?: number;
    monthlyWithdrawLimit?: number;
  };

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

  let newWithdrawalSettings: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =
    wallet.withdrawalSettings ?? Prisma.JsonNull;

  if (withdrawalSettings !== undefined) {
    if (isObject(wallet.withdrawalSettings) && isObject(withdrawalSettings)) {
      newWithdrawalSettings = {
        ...(wallet.withdrawalSettings as Prisma.InputJsonObject),
        ...(withdrawalSettings as Prisma.InputJsonObject),
      };
    } else {
      newWithdrawalSettings = withdrawalSettings;
    }
  }

  const updated = await prisma.wallet.update({
    where: { userId },
    data: {
      withdrawalSettings: newWithdrawalSettings,
      dailyWithdrawLimit:
        dailyWithdrawLimit !== undefined ? dailyWithdrawLimit : wallet.dailyWithdrawLimit,
      monthlyWithdrawLimit:
        monthlyWithdrawLimit !== undefined ? monthlyWithdrawLimit : wallet.monthlyWithdrawLimit,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Wallet settings updated successfully',
    data: {
      withdrawalSettings: updated.withdrawalSettings,
      limits: {
        dailyWithdrawLimit: updated.dailyWithdrawLimit,
        monthlyWithdrawLimit: updated.monthlyWithdrawLimit,
      },
    },
  });
};