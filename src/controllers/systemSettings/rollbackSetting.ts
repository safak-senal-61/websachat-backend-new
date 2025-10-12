import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma } from '../../generated/prisma';

export default async function rollbackSetting(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { key } = req.params;
    const { version } = req.query;
    const { reason } = (req.body ?? {}) as { reason?: unknown };

    if (typeof key !== 'string' || !key.trim()) {
      res.status(400).json({
        success: false,
        message: 'Geçersiz ayar anahtarı'
      });
      return;
    }

    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) {
      res.status(404).json({
        success: false,
        message: 'Ayar bulunamadı'
      });
      return;
    }

    // Sürüm daraltma ve doğrulama
    let targetVersion: number | undefined = undefined;
    if (version !== undefined) {
      if (typeof version !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Geçersiz sürüm numarası'
        });
        return;
      }
      const parsed = Number(version);
      if (Number.isNaN(parsed) || parsed < 0) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz sürüm numarası'
        });
        return;
      }
      targetVersion = parsed;
    }

    const userInfo = req.user as { id?: unknown; _id?: unknown } | undefined;
    const userId =
      typeof userInfo?.id === 'string'
        ? userInfo.id
        : typeof userInfo?._id === 'string'
          ? userInfo._id
          : null;

    const historyRaw: unknown = setting.history ?? [];
    interface HistoryEntry {
      timestamp: string;
      modifiedBy?: string | null;
      reason?: string;
      previousValue?: unknown;
      newValue?: unknown;
    }
    const isHistoryEntry = (entry: unknown): entry is HistoryEntry =>
      typeof entry === 'object' && entry !== null && 'timestamp' in entry;

    const history: HistoryEntry[] = Array.isArray(historyRaw)
      ? historyRaw.filter(isHistoryEntry)
      : [];

    if (history.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Geri alınacak geçmiş kaydı bulunamadı'
      });
      return;
    }

    let targetValue: unknown = null;
    if (targetVersion !== undefined) {
      if (targetVersion >= history.length) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz sürüm numarası'
        });
        return;
      }
      const entry = history[targetVersion];
      if (!entry) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz sürüm numarası'
        });
        return;
      }
      targetValue = entry.previousValue ?? entry.newValue ?? null;
    } else {
      const lastEntry = history.length > 0 ? history[history.length - 1] : undefined;
      if (!lastEntry) {
        res.status(400).json({
          success: false,
          message: 'Geri alınacak geçmiş kaydı bulunamadı'
        });
        return;
      }
      targetValue = lastEntry.previousValue ?? null;
    }

    const timestamp = new Date().toISOString();
    const reasonVal = typeof reason === 'string' && reason.trim() ? reason.trim() : 'Rollback';

    const prevHistoryObjects: Prisma.InputJsonValue[] = history.map((h) => ({
      timestamp: h.timestamp,
      modifiedBy: h.modifiedBy ?? null,
      reason: h.reason ?? '',
      previousValue: (h.previousValue ?? null) as Prisma.InputJsonValue,
      newValue: (h.newValue ?? null) as Prisma.InputJsonValue
    } satisfies Prisma.InputJsonObject));

    const newHistoryArray: Prisma.InputJsonValue[] = [
      ...prevHistoryObjects,
      {
        timestamp,
        modifiedBy: userId,
        reason: reasonVal,
        previousValue: (setting.value ?? null) as Prisma.InputJsonValue,
        newValue: (targetValue ?? null) as Prisma.InputJsonValue
      } satisfies Prisma.InputJsonObject
    ];

    await prisma.systemSetting.update({
      where: { id: setting.id },
      data: {
        value: (targetValue ?? null) as Prisma.InputJsonValue,
        modifiedBy: userId,
        history: { set: newHistoryArray }
      }
    });

    res.json({
      success: true,
      message: 'Ayar geri alındı'
    });
  } catch (error) {
    console.error('Rollback setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar geri alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}