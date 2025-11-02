// Dosya: getSettings.ts - Fonksiyon: getSettings
import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import type { Prisma, SystemSetting } from '../../generated/prisma';

export default async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  const q = req.query as Record<string, unknown>;
  const category = q?.category;
  const publicOnlyRaw = q?.publicOnly ?? false;
  const search = q?.search;
  const pageRaw = q?.page ?? 1;
  const limitRaw = q?.limit ?? 20;
  const sortByRaw = q?.sortBy ?? 'key';
  const sortOrderRaw = q?.sortOrder ?? 'asc';

  const isPrivileged = !!req.user?.role && ['admin', 'moderator'].includes(req.user.role);
  const isPublicOnly = String(publicOnlyRaw) === 'true';
  const pageNum = Number(pageRaw) || 1;
  const limitNum = Number(limitRaw) || 20;

  // Build DB where without text search to avoid unsupported 'mode'
  const whereDB: Prisma.SystemSettingWhereInput = {};
  if (typeof category === 'string' && category.trim()) {
    whereDB.category = category;
  }
  if (isPublicOnly || !isPrivileged) {
    whereDB.isPublic = true;
  }

  const sortableFields = new Set(['key', 'category', 'updatedAt', 'createdAt']);
  const sortField = sortableFields.has(String(sortByRaw)) ? String(sortByRaw) : 'key';
  const sortOrder = String(sortOrderRaw) === 'desc' ? 'desc' : 'asc';

  let orderBy: Prisma.SystemSettingOrderByWithRelationInput;
  if (sortField === 'key') orderBy = { key: sortOrder };
  else if (sortField === 'category') orderBy = { category: sortOrder };
  else if (sortField === 'updatedAt') orderBy = { updatedAt: sortOrder };
  else orderBy = { createdAt: sortOrder };

  const skip = (pageNum - 1) * limitNum;

  const baseSettings = await prisma.systemSetting.findMany({
    where: whereDB,
    orderBy,
  });

  // Case-insensitive search in-memory on key
  const term = typeof search === 'string' ? search.toLowerCase().trim() : '';
  const filtered = term
    ? baseSettings.filter((s) => (s.key ?? '').toLowerCase().includes(term))
    : baseSettings;

  const total = filtered.length;
  const settings = filtered.slice(skip, skip + limitNum);

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
    data: {
      settings: formattedSettings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
}