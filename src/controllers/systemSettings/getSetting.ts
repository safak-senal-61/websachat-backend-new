import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export default async function getSetting(req: AuthRequest, res: Response): Promise<void> {
  try {
    const keyParam = req.params?.key;
    if (!keyParam || typeof keyParam !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Key parametresi gerekli'
      });
      return;
    }

    const q = req.query as Record<string, unknown>;
    const includeHistoryRaw = q?.includeHistory ?? false;
    const includeMetadataRaw = q?.includeMetadata ?? true;
    const includeHistory = String(includeHistoryRaw) !== 'false';
    const includeMetadata = String(includeMetadataRaw) !== 'false';

    const setting = await prisma.systemSetting.findUnique({ where: { key: keyParam } });

    if (!setting) {
      res.status(404).json({
        success: false,
        message: 'Ayar bulunamadı'
      });
      return;
    }

    const isPrivileged = !!req.user?.role && ['admin', 'moderator'].includes(req.user.role);

    const result: {
      key: string;
      value: unknown;
      category: string | null;
      metadata?: unknown;
      history?: unknown;
    } = {
      key: setting.key,
      value: setting.value,
      category: setting.category,
    };

    if (isPrivileged) {
      if (includeMetadata && setting.metadata) result.metadata = setting.metadata;
      if (includeHistory && setting.history) result.history = setting.history;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}