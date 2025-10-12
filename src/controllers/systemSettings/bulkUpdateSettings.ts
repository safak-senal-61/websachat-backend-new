import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export default async function bulkUpdateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { settings, reason } = req.body as { settings: Array<{ key: string; value: unknown; reason?: string }>; reason?: string };
    const results: Array<{ key: string; success: boolean }> = [];
    const errors: Array<{ key: string; error: string }> = [];

    // Kimlik (id veya _id) tercih sırasına göre
    // id veya _id güvenli biçimde alınır (any yok)
    const uid1 = req.user?.id;
    const uid2 = (req.user as Record<string, unknown> | undefined)?.['_id'];
    const actorId: string | undefined = typeof uid1 === 'string' ? uid1 : typeof uid2 === 'string' ? uid2 : undefined;

    for (const settingUpdate of settings) {
      try {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: settingUpdate.key },
        });

        if (!setting) {
          errors.push({ key: settingUpdate.key, error: 'Ayar bulunamadı' });
          continue;
        }

        if (!setting.isEditable) {
          errors.push({ key: settingUpdate.key, error: 'Bu ayar düzenlenemez' });
          continue;
        }

        const newHistory: unknown[] = Array.isArray(setting.history) ? [...(setting.history as unknown[])] : [];
        newHistory.push({
          action: 'UPDATE',
          value: settingUpdate.value,
          modifiedBy: actorId ?? null,
          reason: settingUpdate.reason || reason,
          updatedAt: new Date().toISOString(),
        });

        await prisma.systemSetting.update({
          where: { key: settingUpdate.key },
          data: {
            // Json alanı: Prisma.InputJsonValue ile tip güvenliği
            value: settingUpdate.value as Prisma.InputJsonValue,
            history: newHistory as unknown as Prisma.InputJsonValue,
            modifiedBy: actorId ?? null,
          },
        });

        results.push({ key: settingUpdate.key, success: true });
      } catch (error) {
        errors.push({ key: settingUpdate.key, error: (error as Error).message });
      }
    }

    res.json({
      success: errors.length === 0,
      message: errors.length === 0 ? 'Tüm ayarlar başarıyla güncellendi' : 'Bazı ayarlar güncellenirken hata oluştu',
      data: {
        successful: results,
        failed: errors
      }
    });
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar güncellenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}