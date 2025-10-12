import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma } from '../../generated/prisma';

export default async function resetSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, keys } = req.body as {
      category?: unknown;
      keys?: unknown;
    };

    const where: Prisma.SystemSettingWhereInput = {};
    if (typeof category === 'string' && category.trim()) {
      where.category = category;
    }
    if (Array.isArray(keys) && keys.length > 0) {
      where.key = { in: keys.map((k) => String(k)) };
    }

    const userInfo = req.user as { id?: unknown; _id?: unknown } | undefined;
    const userId =
      typeof userInfo?.id === 'string'
        ? userInfo.id
        : typeof userInfo?._id === 'string'
          ? userInfo._id
          : null;

    const timestamp = new Date().toISOString();

    const toReset = await prisma.systemSetting.findMany({ where });

    const isObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;

    interface HistoryEntry {
      timestamp: string;
      modifiedBy: string | null;
      reason: string;
      previousValue?: unknown;
      newValue?: unknown;
    }
    const isHistoryEntry = (entry: unknown): entry is HistoryEntry =>
      typeof entry === 'object' && entry !== null && 'timestamp' in entry;

    let resetCount = 0;
    for (const setting of toReset) {
      const metadataRaw: unknown = setting.metadata ?? {};
      const defaultValue =
        isObject(metadataRaw) && 'defaultValue' in metadataRaw
          ? (metadataRaw as Record<string, unknown>).defaultValue ?? null
          : null;

      const prevHistoryRaw: unknown = setting.history ?? [];
      const prevHistory: HistoryEntry[] = Array.isArray(prevHistoryRaw)
        ? prevHistoryRaw.filter(isHistoryEntry)
        : [];

      const newEntry: HistoryEntry = {
        timestamp,
        modifiedBy: userId,
        reason: 'reset to default',
        previousValue: setting.value ?? null,
        newValue: defaultValue
      };

      const prevHistoryObjects: Prisma.InputJsonValue[] = prevHistory.map((h) => ({
        timestamp: h.timestamp,
        modifiedBy: h.modifiedBy ?? null,
        reason: h.reason ?? '',
        previousValue: (h.previousValue ?? null) as Prisma.InputJsonValue,
        newValue: (h.newValue ?? null) as Prisma.InputJsonValue
      } satisfies Prisma.InputJsonObject));

      const newHistoryArray: Prisma.InputJsonValue[] = [
        ...prevHistoryObjects,
        {
          timestamp: newEntry.timestamp,
          modifiedBy: newEntry.modifiedBy,
          reason: newEntry.reason,
          previousValue: (newEntry.previousValue ?? null) as Prisma.InputJsonValue,
          newValue: (newEntry.newValue ?? null) as Prisma.InputJsonValue
        } satisfies Prisma.InputJsonObject
      ];

      await prisma.systemSetting.update({
        where: { id: setting.id },
        data: {
          value: (defaultValue ?? null) as Prisma.InputJsonValue,
          modifiedBy: userId,
          history: { set: newHistoryArray }
        }
      });
      resetCount += 1;
    }

    res.json({
      success: true,
      message: 'Ayarlar başarıyla sıfırlandı',
      data: { resetCount }
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar sıfırlanırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}