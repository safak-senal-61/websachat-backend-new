import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma } from '../../generated/prisma';

export default async function updatePrivacySettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { settings, reason } = req.body as { settings?: unknown; reason?: unknown };

    const results: Array<{ key: string; success: boolean }> = [];
    const errors: Array<{ key: string; error: string }> = [];

    const uid1 = req.user?.id;
    const uid2 = (req.user as Record<string, unknown> | undefined)?.['_id'];
    const userId: string | undefined =
      typeof uid1 === 'string' ? uid1 : typeof uid2 === 'string' ? uid2 : undefined;
    const timestamp = new Date().toISOString();

    const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
    const getSection = (obj: unknown, key: string): Record<string, unknown> | undefined => {
      if (!isObject(obj)) return undefined;
      const val = obj[key];
      return isObject(val) ? (val as Record<string, unknown>) : undefined;
    };

    async function updateByKey(settingKey: string, value: unknown): Promise<void> {
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
        if (setting && setting.isEditable) {
          const prevHistoryRaw: unknown = setting.history ?? [];
          interface HistoryEntry {
            timestamp: string;
            modifiedBy?: string | null;
            reason?: string;
            previousValue?: unknown;
            newValue?: unknown;
          }
          const isHistoryEntry = (entry: unknown): entry is HistoryEntry =>
            typeof entry === 'object' && entry !== null && 'timestamp' in entry;

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
              modifiedBy: userId ?? null,
              reason: (typeof reason === 'string' && reason.trim() ? reason.trim() : 'Update privacy setting'),
              previousValue: (setting.value ?? null) as Prisma.InputJsonValue,
              newValue: (value ?? null) as Prisma.InputJsonValue
            } satisfies Prisma.InputJsonObject
          ];

          await prisma.systemSetting.update({
            where: { id: setting.id },
            data: {
              value: (value ?? null) as Prisma.InputJsonValue,
              modifiedBy: userId ?? null,
              history: { set: newHistoryArray }
            }
          });
          results.push({ key: settingKey, success: true });
        } else {
          errors.push({ key: settingKey, error: 'Ayar bulunamadı veya düzenlenemez' });
        }
      } catch (error) {
        errors.push({ key: settingKey, error: (error as Error).message });
      }
    }

    const rootSettings = isObject(settings) ? (settings as Record<string, unknown>) : {};
    const dataRetention = getSection(rootSettings, 'dataRetention');
    const cookieSettings = getSection(rootSettings, 'cookieSettings');
    const dataSharing = getSection(rootSettings, 'dataSharing');
    const userRights = getSection(rootSettings, 'userRights');

    if (dataRetention) {
      for (const [key, value] of Object.entries(dataRetention)) {
        await updateByKey(`privacy.dataRetention.${key}`, value);
      }
    }

    if (cookieSettings) {
      for (const [key, value] of Object.entries(cookieSettings)) {
        await updateByKey(`privacy.cookies.${key}`, value);
      }
    }

    if (dataSharing) {
      for (const [key, value] of Object.entries(dataSharing)) {
        await updateByKey(`privacy.dataSharing.${key}`, value);
      }
    }

    if (userRights) {
      for (const [key, value] of Object.entries(userRights)) {
        await updateByKey(`privacy.userRights.${key}`, value);
      }
    }

    res.json({
      success: errors.length === 0,
      message: errors.length === 0 ? 'Gizlilik ayarları başarıyla güncellendi' : 'Bazı gizlilik ayarları güncellenirken hata oluştu',
      data: {
        successful: results,
        failed: errors
      }
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Gizlilik ayarları güncellenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}