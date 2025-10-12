import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma } from '../../generated/prisma';

export default async function updateSetting(req: AuthRequest, res: Response): Promise<void> {
  // Kimlik doğrulama kontrolü
  const uid1 = req.user?.id;
  const uid2 = (req.user as Record<string, unknown> | undefined)?.['_id'];
  const userIdRaw = typeof uid1 === 'string' ? uid1 : typeof uid2 === 'string' ? uid2 : undefined;
  if (!userIdRaw) {
    res.status(401).json({
      success: false,
      message: 'Kimlik doğrulama gerekli'
    });
    return;
  }
  const userId = userIdRaw;

  // İstek gövdesinden değerleri al ve doğrula
  const { key, value, reason } = (req.body ?? {}) as { key?: unknown; value?: unknown; reason?: unknown };
  if (typeof key !== 'string' || !key.trim()) {
    res.status(400).json({
      success: false,
      message: 'Geçersiz ayar anahtarı'
    });
    return;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) {
      res.status(404).json({
        success: false,
        message: 'Ayar bulunamadı'
      });
      return;
    }

    if (!setting.isEditable) {
      res.status(400).json({
        success: false,
        message: 'Bu ayar düzenlenemez'
      });
      return;
    }

    const timestamp = new Date().toISOString();

    interface HistoryEntry {
      timestamp: string;
      modifiedBy?: string | null;
      reason?: string;
      previousValue?: unknown;
      newValue?: unknown;
    }
    const isHistoryEntry = (entry: unknown): entry is HistoryEntry =>
      typeof entry === 'object' && entry !== null && 'timestamp' in entry;

    const prevHistoryRaw: unknown = setting.history ?? [];
    const prevHistory: HistoryEntry[] = Array.isArray(prevHistoryRaw)
      ? prevHistoryRaw.filter(isHistoryEntry)
      : [];

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
        timestamp,
        modifiedBy: userId,
        reason: typeof reason === 'string' && reason.trim() ? reason.trim() : 'Update',
        previousValue: (setting.value ?? null) as Prisma.InputJsonValue,
        newValue: (value ?? null) as Prisma.InputJsonValue
      } satisfies Prisma.InputJsonObject
    ];

    await prisma.systemSetting.update({
      where: { id: setting.id },
      data: {
        value: (value ?? null) as Prisma.InputJsonValue,
        modifiedBy: userId,
        history: { set: newHistoryArray }
      }
    });

    res.json({
      success: true,
      message: 'Ayar başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar güncellenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
    return;
  }
}