import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export default async function exportSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      category,
      format = 'json',
      includeMetadata = 'true',
      includeHistory = 'false',
      publicOnly = 'false'
    } = req.query as Record<string, string>;

    const options = {
      category: category,
      includeMetadata: includeMetadata === 'true',
      includeHistory: includeHistory === 'true',
      publicOnly: publicOnly === 'true'
    };

    const settings = await prisma.systemSetting.findMany({
      where: {
        ...(options.category ? { category: options.category } : {}),
        ...(options.publicOnly ? { isPublic: true } : {}),
      },
    });

    type SettingExportEntry = { value: unknown; metadata?: unknown; history?: unknown };
    const exportData: Record<string, SettingExportEntry> = {};
    for (const s of settings) {
      const entry: SettingExportEntry = { value: s.value };
      if (options.includeMetadata && s.metadata) entry.metadata = s.metadata;
      if (options.includeHistory && s.history) entry.history = s.history;
      exportData[s.key] = entry;
    }

    const filename = `settings_${options.category || 'all'}_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    switch (format) {
    case 'json':
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(exportData, null, 2));
      break;
    case 'yaml':
      // Basit YAML çıktısı için JSON'u string olarak veriyoruz (gerçek YAML gereksinimi varsa ek kütüphane gerekir)
      res.setHeader('Content-Type', 'application/x-yaml');
      res.send(JSON.stringify(exportData, null, 2));
      break;
    case 'env':
      res.setHeader('Content-Type', 'text/plain');
      const envContent = Object.entries(exportData)
        .map(([key, value]) => `${key.toUpperCase()}=${JSON.stringify(value)}`)
        .join('\n');
      res.send(envContent);
      break;
    default:
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(exportData, null, 2));
    }
  } catch (error) {
    console.error('Export settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar dışa aktarılırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}