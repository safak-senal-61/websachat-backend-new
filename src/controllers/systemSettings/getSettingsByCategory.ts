// Dosya: getSettingsByCategory.ts - Fonksiyon: getSettingsByCategory
import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma, SystemSetting } from '../../generated/prisma';

export default async function getSettingsByCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const categoryParam = req.params?.category;
    if (!categoryParam || typeof categoryParam !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Kategori parametresi gerekli.'
      });
      return;
    }

    const q = req.query as Record<string, unknown>;
    const publicOnlyRaw = q?.publicOnly ?? false;
    const isPublicOnly = String(publicOnlyRaw) === 'true';

    const isPrivileged = !!req.user?.role && ['admin', 'moderator'].includes(req.user.role);

    const where: Prisma.SystemSettingWhereInput = { category: categoryParam };
    if (isPublicOnly || !isPrivileged) {
      where.isPublic = true;
    }

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: { key: 'asc' }
    });

    const formattedSettings = settings.map((setting: SystemSetting) => {
      if (isPublicOnly || !isPrivileged) {
        const { metadata, history, ...publicView } = setting;
        // Mark as used to satisfy lint while omitting them from the response
        void metadata;
        void history;
        return publicView;
      }
      return setting;
    });

    res.json({
      success: true,
      data: formattedSettings
    });
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori ayarları alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}