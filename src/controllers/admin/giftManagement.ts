// Dosya: giftManagement.ts içine yeni admin uçları eklenir
import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { logger } from '@/utils/logger';

type GiftItem = {
  id: string | number;
  name: string;
  icon?: string;
  coins: number;
  xp: number;
  animation?: string;
};

const prisma = new PrismaClient();

// Hediye kataloğunu getir
export const getGiftCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const giftCatalogSetting = await prisma.systemSetting.findUnique({
      where: { key: 'gift_catalog' }
    });

    let giftCatalog: GiftItem[] = [];
    if (giftCatalogSetting?.value !== undefined && giftCatalogSetting?.value !== null) {
      const raw = giftCatalogSetting.value;
      if (typeof raw === 'string') {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            giftCatalog = parsed as GiftItem[];
          }
        } catch (error) {
          logger.error('Error parsing gift catalog:', error);
        }
      } else if (Array.isArray(raw)) {
        giftCatalog = raw as unknown as GiftItem[];
      } else if (typeof raw === 'object') {
        // object geldiyse beklenen format dizi değilse boş bırak
        // gerekliyse burada objeden diziye dönüştürme kuralı eklenebilir
      }
    }

    res.json({
      success: true,
      data: giftCatalog
    });
  } catch (error) {
    logger.error('Error fetching gift catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Hediye kataloğu getirilirken hata oluştu'
    });
  }
};

// Hediye kataloğunu güncelle
export const updateGiftCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gifts } = req.body;

    // Hediye verilerini doğrula
    if (!Array.isArray(gifts)) {
      res.status(400).json({
        success: false,
        message: 'Hediye listesi geçerli bir dizi olmalıdır'
      });
      return;
    }

    // Her hediyenin gerekli alanlarını kontrol et
    for (const gift of gifts) {
      if (!gift.id || !gift.name || typeof gift.coins !== 'number' || typeof gift.xp !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Her hediye için id, name, coins ve xp alanları gereklidir'
        });
        return;
      }
    }

    // Hediye kataloğunu güncelle
    await prisma.systemSetting.upsert({
      where: { key: 'gift_catalog' },
      update: { value: JSON.stringify(gifts) },
      create: {
        key: 'gift_catalog',
        value: JSON.stringify(gifts)
      }
    });

    logger.info('Gift catalog updated by admin', { giftCount: gifts.length });

    res.json({
      success: true,
      message: 'Hediye kataloğu başarıyla güncellendi',
      data: gifts
    });
  } catch (error) {
    logger.error('Error updating gift catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Hediye kataloğu güncellenirken hata oluştu'
    });
  }
};

// Tek hediye ekle
export const addGift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, icon, coins, xp, animation } = req.body;

    if (!id || !name || typeof coins !== 'number' || typeof xp !== 'number') {
      res.status(400).json({
        success: false,
        message: 'id, name, coins ve xp alanları gereklidir'
      });
      return;
    }

    // Mevcut kataloğu getir
    const giftCatalogSetting = await prisma.systemSetting.findUnique({
      where: { key: 'gift_catalog' }
    });

    let giftCatalog: GiftItem[] = [];
    if (giftCatalogSetting?.value !== undefined && giftCatalogSetting?.value !== null) {
      const raw = giftCatalogSetting.value;
      if (typeof raw === 'string') {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            giftCatalog = parsed as GiftItem[];
          }
        } catch (error) {
          logger.error('Error parsing existing gift catalog:', error);
          res.status(500).json({
            success: false,
            message: 'Hediye kataloğu okunamadı'
          });
          return;
        }
      } else if (Array.isArray(raw)) {
        giftCatalog = raw as unknown as GiftItem[];
      }
    }

    const existingGiftIndex = giftCatalog.findIndex((gift: GiftItem) => gift.id === id);
    if (existingGiftIndex !== -1) {
      res.status(400).json({
        success: false,
        message: 'Bu ID ile bir hediye zaten mevcut'
      });
      return;
    }

    const newGift: GiftItem = {
      id,
      name,
      icon: icon || '🎁',
      coins,
      xp,
      animation: animation || 'bounce'
    };

    giftCatalog.push(newGift);

    // Kataloğu güncelle
    await prisma.systemSetting.upsert({
      where: { key: 'gift_catalog' },
      update: { value: JSON.stringify(giftCatalog) },
      create: {
        key: 'gift_catalog',
        value: JSON.stringify(giftCatalog)
      }
    });

    logger.info('New gift added to catalog', { giftId: id, giftName: name });

    res.json({
      success: true,
      message: 'Hediye başarıyla eklendi',
      data: newGift
    });
  } catch (error) {
    logger.error('Error adding gift:', error);
    res.status(500).json({
      success: false,
      message: 'Hediye eklenirken hata oluştu'
    });
  }
};

// Hediye güncelle
export const updateGift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, icon, coins, xp, animation } = req.body;

    const giftCatalogSetting = await prisma.systemSetting.findUnique({
      where: { key: 'gift_catalog' }
    });

    let giftCatalog: GiftItem[] = [];
    if (giftCatalogSetting?.value !== undefined && giftCatalogSetting?.value !== null) {
      const raw = giftCatalogSetting.value;
      if (typeof raw === 'string') {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            giftCatalog = parsed as GiftItem[];
          }
        } catch (error) {
          logger.error('Error parsing existing gift catalog:', error);
          res.status(500).json({
            success: false,
            message: 'Hediye kataloğu okunamadı'
          });
          return;
        }
      } else if (Array.isArray(raw)) {
        giftCatalog = raw as unknown as GiftItem[];
      } else if (typeof raw === 'object') {
        // object geldiyse beklenen format dizi değilse boş bırak
        // gerekliyse burada objeden diziye dönüştürme kuralı eklenebilir
      }
    }

    const giftIndex = giftCatalog.findIndex((gift: GiftItem) => gift.id === id);
    if (giftIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Hediye bulunamadı'
      });
      return;
    }

    giftCatalog[giftIndex] = {
      ...giftCatalog[giftIndex],
      ...(name && { name }),
      ...(icon && { icon }),
      ...(typeof coins === 'number' && { coins }),
      ...(typeof xp === 'number' && { xp }),
      ...(animation && { animation })
    };

    await prisma.systemSetting.update({
      where: { key: 'gift_catalog' },
      data: { value: JSON.stringify(giftCatalog) }
    });

    logger.info('Gift updated in catalog', { giftId: id });

    res.json({
      success: true,
      message: 'Hediye başarıyla güncellendi',
      data: giftCatalog[giftIndex]
    });
  } catch (error) {
    logger.error('Error updating gift:', error);
    res.status(500).json({
      success: false,
      message: 'Hediye güncellenirken hata oluştu'
    });
  }
};

// Hediye sil
export const deleteGift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const giftCatalogSetting = await prisma.systemSetting.findUnique({
      where: { key: 'gift_catalog' }
    });

    let giftCatalog: GiftItem[] = [];
    if (giftCatalogSetting?.value !== undefined && giftCatalogSetting?.value !== null) {
      const raw = giftCatalogSetting.value;
      if (typeof raw === 'string') {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            giftCatalog = parsed as GiftItem[];
          }
        } catch (error) {
          logger.error('Error parsing existing gift catalog:', error);
          res.status(500).json({
            success: false,
            message: 'Hediye kataloğu okunamadı'
          });
          return;
        }
      } else if (Array.isArray(raw)) {
        giftCatalog = raw as unknown as GiftItem[];
      } else if (typeof raw === 'object') {
        // object geldiyse beklenen format dizi değilse boş bırak
        // gerekliyse burada objeden diziye dönüştürme kuralı eklenebilir
      }
    }

    const initialLength = giftCatalog.length;
    giftCatalog = giftCatalog.filter((gift: GiftItem) => gift.id !== id);

    if (giftCatalog.length === initialLength) {
      res.status(404).json({
        success: false,
        message: 'Hediye bulunamadı'
      });
      return;
    }

    await prisma.systemSetting.update({
      where: { key: 'gift_catalog' },
      data: { value: JSON.stringify(giftCatalog) }
    });

    logger.info('Gift deleted from catalog', { giftId: id });

    res.json({
      success: true,
      message: 'Hediye başarıyla silindi'
    });
  } catch (error) {
    logger.error('Error deleting gift:', error);
    res.status(500).json({
      success: false,
      message: 'Hediye silinirken hata oluştu'
    });
  }
};

// Hediye ekonomisi (coin_kurus ve commission_rate) getir
export const getGiftEconomy = async (req: Request, res: Response): Promise<void> => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'gift_economy' } });

    let economy = { coin_kurus: 5, commission_rate: 0.5 };
    const raw = setting?.value;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
          const p = parsed as { coin_kurus?: unknown; commission_rate?: unknown };
          economy = {
            coin_kurus: Number(p.coin_kurus ?? economy.coin_kurus),
            commission_rate: Number(p.commission_rate ?? economy.commission_rate),
          };
        }
      } catch {
        // parse hatası: varsayılanları kullan
      }
    } else if (raw && typeof raw === 'object') {
      const p = raw as { coin_kurus?: unknown; commission_rate?: unknown };
      economy = {
        coin_kurus: Number(p.coin_kurus ?? economy.coin_kurus),
        commission_rate: Number(p.commission_rate ?? economy.commission_rate),
      };
    }

    res.json({ success: true, data: economy });
  } catch (error) {
    logger.error('Error fetching gift economy:', error);
    res.status(500).json({ success: false, message: 'Hediye ekonomisi getirilemedi' });
  }
};

// Hediye ekonomisi güncelle
export const updateGiftEconomy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { coin_kurus, commission_rate } = req.body;

    // Validasyon
    const coinVal = Number(coin_kurus);
    const rateVal = Number(commission_rate);

    if (!Number.isFinite(coinVal) || coinVal <= 0) {
      res.status(400).json({ success: false, message: 'coin_kurus pozitif olmalıdır' });
      return;
    }
    if (!Number.isFinite(rateVal) || rateVal < 0 || rateVal > 1) {
      res.status(400).json({ success: false, message: 'commission_rate 0 ile 1 arasında olmalıdır' });
      return;
    }

    const newEconomy = { coin_kurus: Math.floor(coinVal), commission_rate: rateVal };

    await prisma.systemSetting.upsert({
      where: { key: 'gift_economy' },
      update: { value: JSON.stringify(newEconomy) },
      create: { key: 'gift_economy', value: JSON.stringify(newEconomy) },
    });

    logger.info('Gift economy updated by admin', newEconomy);
    res.json({ success: true, message: 'Hediye ekonomisi güncellendi', data: newEconomy });
  } catch (error) {
    logger.error('Error updating gift economy:', error);
    res.status(500).json({ success: false, message: 'Hediye ekonomisi güncellenemedi' });
  }
};