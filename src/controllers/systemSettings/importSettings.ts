// Üst importlar
import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma } from '../../generated/prisma';

export default async function importSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { settings, overwrite = false, reason } = req.body as {
      settings?: unknown;
      overwrite?: boolean;
      reason?: unknown;
    };

    if (
      settings === undefined ||
      (!Array.isArray(settings) && typeof settings !== 'object')
    ) {
      res.status(400).json({
        success: false,
        message: 'Geçerli "settings" verisi sağlanmalıdır'
      });
      return;
    }

    const isObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;

    type RawItem = {
      key?: unknown;
      value?: unknown;
      category?: unknown;
      isPublic?: unknown;
      isEditable?: unknown;
      metadata?: unknown;
    };

    const rawItems: RawItem[] = Array.isArray(settings)
      ? (settings as unknown[])
        .filter(isObject)
        .map((obj) => obj as RawItem)
      : Object.entries(settings as Record<string, unknown>).map(([key, value]) => ({
        key,
        value
      }));

    const userInfo = req.user as { id?: unknown; _id?: unknown } | undefined;
    const userId =
      typeof userInfo?.id === 'string'
        ? userInfo.id
        : typeof userInfo?._id === 'string'
          ? userInfo._id
          : null;

    const timestamp = new Date().toISOString();

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const s of rawItems) {
      const keyStr = typeof s?.key === 'string' ? s.key : String(s?.key ?? '');
      if (!keyStr) {
        skippedCount += 1;
        continue;
      }

      const existing = await prisma.systemSetting.findUnique({
        where: { key: String(keyStr) }
      });

      const valueJson = (s.value ?? null) as Prisma.InputJsonValue;
      const categoryStr =
        s.category !== undefined && s.category !== null
          ? String(s.category)
          : null;
      const isPublicBool =
        typeof s.isPublic === 'boolean' ? s.isPublic : false;
      const isEditableBool =
        typeof s.isEditable === 'boolean' ? s.isEditable : true;
      const metadataJson =
        (s.metadata ?? {}) as Prisma.InputJsonValue;

      interface HistoryEntry {
        timestamp: string;
        modifiedBy: string | null;
        reason: string;
        previousValue?: unknown;
        newValue?: unknown;
      }
      const isHistoryEntry = (entry: unknown): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        'timestamp' in entry;

      if (!existing) {
        const newHistoryArray: Prisma.InputJsonValue[] = [
          {
            timestamp,
            modifiedBy: userId,
            reason: typeof reason === 'string' && reason.trim() ? reason.trim() : 'import create',
            newValue: (valueJson ?? null) as Prisma.InputJsonValue
          } satisfies Prisma.InputJsonObject
        ];

        await prisma.systemSetting.create({
          data: {
            key: String(keyStr),
            category: categoryStr,
            value: (valueJson ?? null) as Prisma.InputJsonValue,
            isPublic: isPublicBool,
            isEditable: isEditableBool,
            metadata: metadataJson,
            history: newHistoryArray,
            modifiedBy: userId
          }
        });
        createdCount += 1;
      } else if (overwrite) {
        const previousValue = existing.value;

        const prevHistoryRaw: unknown = existing.history ?? [];
        const prevHistory: HistoryEntry[] = Array.isArray(prevHistoryRaw)
          ? prevHistoryRaw.filter(isHistoryEntry)
          : [];

        const newEntry: HistoryEntry = {
          timestamp,
          modifiedBy: userId,
          reason:
            typeof reason === 'string' && reason.trim()
              ? reason.trim()
              : 'import overwrite',
          previousValue,
          newValue: valueJson ?? null
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
            previousValue: (previousValue ?? null) as Prisma.InputJsonValue,
            newValue: (valueJson ?? null) as Prisma.InputJsonValue
          } satisfies Prisma.InputJsonObject
        ];

        await prisma.systemSetting.update({
          where: { id: existing.id },
          data: {
            value: (valueJson ?? previousValue ?? null) as Prisma.InputJsonValue,
            category: categoryStr ?? existing.category,
            isPublic: isPublicBool ?? existing.isPublic,
            isEditable: isEditableBool ?? existing.isEditable,
            metadata: (s.metadata ?? existing.metadata ?? {}) as Prisma.InputJsonValue,
            history: { set: newHistoryArray },
            modifiedBy: userId
          }
        });
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    res.json({
      success: true,
      message: 'Ayarlar başarıyla içe aktarıldı',
      data: { createdCount, updatedCount, skippedCount }
    });
  } catch (error) {
    console.error('Import settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar içe aktarılırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}