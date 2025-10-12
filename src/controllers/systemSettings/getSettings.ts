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

  const where: Prisma.SystemSettingWhereInput = {};
  if (typeof category === 'string' && category.trim()) {
    where.category = category;
  }
  if (isPublicOnly || !isPrivileged) {
    where.isPublic = true;
  }
  if (typeof search === 'string' && search.trim()) {
    where.key = {
      contains: search,
      mode: 'insensitive'
    };
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

  const [settings, total] = await Promise.all([
    prisma.systemSetting.findMany({
      where,
      orderBy,
      skip,
      take: limitNum
    }),
    prisma.systemSetting.count({ where })
  ]);

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