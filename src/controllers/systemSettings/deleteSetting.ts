import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export default async function deleteSetting(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { key } = req.params;

    // Erken doğrulama: key zorunlu ve string olmalı
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

    if (!setting.isEditable) {
      res.status(400).json({
        success: false,
        message: 'Bu ayar silinemez'
      });
      return;
    }

    await prisma.systemSetting.delete({ where: { key } });

    res.json({
      success: true,
      message: 'Ayar başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar silinirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}