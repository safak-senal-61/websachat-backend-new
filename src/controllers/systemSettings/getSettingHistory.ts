import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export default async function getSettingHistory(req: AuthRequest, res: Response): Promise<void> {
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
    const page = q?.page ?? 1;
    const limit = q?.limit ?? 20;
    const startDate = q?.startDate;
    const endDate = q?.endDate;
    const modifiedBy = q?.modifiedBy;

    const setting = await prisma.systemSetting.findUnique({
      where: { key: String(keyParam) }
    });

    if (!setting) {
      res.status(404).json({
        success: false,
        message: 'Ayar bulunamadı'
      });
      return;
    }

    const historyUnknown: unknown[] = Array.isArray(setting.history) ? (setting.history as unknown[]) : [];

    interface SettingHistoryEntry {
      timestamp: string;
      modifiedBy?: string | null;
      reason?: string | null;
      previousValue?: unknown;
      newValue?: unknown;
    }
    const isHistoryEntry = (entry: unknown): entry is SettingHistoryEntry =>
      typeof entry === 'object' && entry !== null && 'timestamp' in entry;

    let history: SettingHistoryEntry[] = historyUnknown.filter(isHistoryEntry);

    const start = typeof startDate === 'string' ? new Date(startDate) : undefined;
    const end = typeof endDate === 'string' ? new Date(endDate) : undefined;

    if (start || end) {
      history = history.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        if (start && entryDate < start) return false;
        if (end && entryDate > end) return false;
        return true;
      });
    }

    if (typeof modifiedBy === 'string' && modifiedBy.trim()) {
      const modifiedByStr = modifiedBy;
      history = history.filter((entry) => String(entry.modifiedBy ?? '') === modifiedByStr);
    }

    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    const paginatedHistory = history.slice(skip, skip + limitNum);

    const populatedHistory = await Promise.all(
      paginatedHistory.map(async (entry) => {
        let modifier: { id: string; username: string | null; email: string | null } | null = null;
        if (entry.modifiedBy) {
          modifier = await prisma.user.findUnique({
            where: { id: String(entry.modifiedBy) },
            select: { id: true, username: true, email: true }
          });
        }
        return { ...entry, modifier };
      })
    );

    res.json({
      success: true,
      data: {
        history: populatedHistory,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: history.length,
          pages: Math.ceil(history.length / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get setting history error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar geçmişi alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}