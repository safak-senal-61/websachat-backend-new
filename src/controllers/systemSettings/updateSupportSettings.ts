import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma } from '../../generated/prisma';

export default async function updateSupportSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { settings, reason } = req.body;

    const results: Array<{ key: string; success: boolean }> = [];
    const errors: Array<{ key: string; error: string }> = [];

    // Safely extract user id
    const uid1 = req.user?.id;
    const uid2 = (req.user as Record<string, unknown> | undefined)?.['_id'];
    const userId: string | undefined =
      typeof uid1 === 'string' ? uid1 : typeof uid2 === 'string' ? uid2 : undefined;

    const timestamp = new Date().toISOString();

    const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
    const getSection = (o: Record<string, unknown>, key: string): Record<string, unknown> | undefined => {
      const v = o[key];
      return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : undefined;
    };

    async function updateByKey(settingKey: string, value: unknown): Promise<void> {
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
        if (setting && setting.isEditable) {
          const prevHistoryRaw = Array.isArray(setting.history) ? (setting.history as unknown[]) : [];
          const prevHistoryObjects: Prisma.InputJsonObject[] = prevHistoryRaw.map((h) => {
            const ho = typeof h === 'object' && h !== null ? (h as Record<string, unknown>) : {};
            return {
              timestamp: typeof ho.timestamp === 'string' ? ho.timestamp : timestamp,
              modifiedBy:
                typeof ho.modifiedBy === 'string'
                  ? ho.modifiedBy
                  : typeof ho.modifiedBy === 'number'
                    ? ho.modifiedBy
                    : null,
              reason: typeof ho.reason === 'string' ? ho.reason : '',
              previousValue: (ho.previousValue ?? null) as Prisma.InputJsonValue,
              newValue: (ho.newValue ?? null) as Prisma.InputJsonValue,
            } satisfies Prisma.InputJsonObject;
          });

          const newEntry: Prisma.InputJsonObject = {
            timestamp,
            modifiedBy: userId ?? null,
            reason: typeof reason === 'string' ? reason : 'Update support setting',
            previousValue: (setting.value ?? null) as Prisma.InputJsonValue,
            newValue: (value ?? null) as Prisma.InputJsonValue,
          };

          const newHistoryArray: Prisma.InputJsonObject[] = [...prevHistoryObjects, newEntry];

          await prisma.systemSetting.update({
            where: { id: setting.id },
            data: {
              value: (value ?? null) as Prisma.InputJsonValue,
              modifiedBy: userId ?? null,
              history: newHistoryArray as unknown as Prisma.InputJsonValue,
            },
          });
          results.push({ key: settingKey, success: true });
        } else {
          errors.push({ key: settingKey, error: 'Ayar bulunamadı veya düzenlenemez' });
        }
      } catch (error) {
        errors.push({ key: settingKey, error: (error as Error).message });
      }
    }

    const root = isObject(settings) ? (settings as Record<string, unknown>) : {};

    const ticketSystem = getSection(root, 'ticketSystem');
    if (ticketSystem) {
      for (const [key, value] of Object.entries(ticketSystem)) {
        await updateByKey(`support.ticketSystem.${key}`, value);
      }
    }

    const chatSupport = getSection(root, 'chatSupport');
    if (chatSupport) {
      for (const [key, value] of Object.entries(chatSupport)) {
        await updateByKey(`support.chatSupport.${key}`, value);
      }
    }

    const knowledgeBase = getSection(root, 'knowledgeBase');
    if (knowledgeBase) {
      for (const [key, value] of Object.entries(knowledgeBase)) {
        await updateByKey(`support.knowledgeBase.${key}`, value);
      }
    }

    const contactMethods = getSection(root, 'contactMethods');
    if (contactMethods) {
      for (const [category, categorySettings] of Object.entries(contactMethods)) {
        if (isObject(categorySettings)) {
          for (const [key, value] of Object.entries(categorySettings)) {
            await updateByKey(`support.contactMethods.${category}.${key}`, value);
          }
        }
      }
    }

    res.json({
      success: errors.length === 0,
      message: errors.length === 0 ? 'Destek ayarları başarıyla güncellendi' : 'Bazı destek ayarları güncellenirken hata oluştu',
      data: {
        successful: results,
        failed: errors
      }
    });
  } catch (error) {
    console.error('Update support settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Destek ayarları güncellenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}