import { Request, Response } from 'express';

import { prisma } from '../../config/database';

import type { Prisma } from '../../generated/prisma';

export default async function getPublicSettings(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;

    const where: Prisma.SystemSettingWhereInput = { isPublic: true };
    const categoryParam = Array.isArray(category) ? category[0] : category;
    if (categoryParam && typeof categoryParam === 'string') {
      where.category = categoryParam;
    }

    const settings = await prisma.systemSetting.findMany({ where });

    // Public çıktıda metadata ve history’yi dışarıda bırakıyoruz
    const result = settings.map(s => ({
      key: s.key,
      value: s.value,
      category: s.category,
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Genel ayarlar alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}