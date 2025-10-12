import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma';

export default async function createSetting(req: AuthRequest, res: Response): Promise<void> {
  try {
    const settingData = req.body;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
      return;
    }

    const sanitizedKey = settingData?.key;
    if (!sanitizedKey || typeof sanitizedKey !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Geçerli bir "key" alanı gerekli'
      });
      return;
    }

    const existingSetting = await prisma.systemSetting.findUnique({ where: { key: sanitizedKey } });
    if (existingSetting) {
      res.status(400).json({
        success: false,
        message: 'Bu anahtarla bir ayar zaten mevcut'
      });
      return;
    }

    const setting = await prisma.systemSetting.create({
      data: {
        key: sanitizedKey,
        value: settingData.value as Prisma.InputJsonValue,
        category: settingData.category || null,
        isPublic: settingData.isPublic ?? false,
        isEditable: settingData.isEditable ?? true,
        metadata: (settingData.metadata ?? {}) as Prisma.InputJsonValue,
        history: [
          {
            action: 'CREATE',
            value: settingData.value as Prisma.InputJsonValue,
            modifiedBy: req.user.id,
            updatedAt: new Date().toISOString(),
          },
        ] as Prisma.InputJsonValue,
        modifiedBy: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Ayar başarıyla oluşturuldu',
      data: setting
    });
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar oluşturulurken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}