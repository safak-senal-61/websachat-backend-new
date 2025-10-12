import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export default async function validateSettingValue(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { key, value } = (req.body ?? {}) as { key?: unknown; value?: unknown };

    if (typeof key !== 'string' || !key.trim()) {
      res.status(400).json({
        success: false,
        message: 'Geçersiz ayar anahtarı'
      });
      return;
    }

    if (value === undefined) {
      res.status(400).json({
        success: false,
        message: 'Değer gerekli'
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

    interface ValidationRules {
      type?: string;
      allowedValues?: unknown[];
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    }

    const getValidationRules = (meta: unknown): ValidationRules | undefined => {
      if (!meta || typeof meta !== 'object') return undefined;
      const obj = meta as Record<string, unknown>;
      const raw = obj['validation'] ?? obj['rules'];
      if (!raw || typeof raw !== 'object') return undefined;
      const r = raw as Record<string, unknown>;
  
      // exactOptionalPropertyTypes uyumluluğu için, undefined atamadan koşullu ekleyelim
      const rules: ValidationRules = {};
      if (typeof r.type === 'string') rules.type = r.type;
      if (Array.isArray(r.allowedValues)) rules.allowedValues = r.allowedValues as unknown[];
      if (typeof r.min === 'number') rules.min = r.min;
      if (typeof r.max === 'number') rules.max = r.max;
      if (typeof r.minLength === 'number') rules.minLength = r.minLength;
      if (typeof r.maxLength === 'number') rules.maxLength = r.maxLength;
      if (typeof r.pattern === 'string') rules.pattern = r.pattern;
  
      return rules;
    };

    const rules = getValidationRules(setting.metadata);
    let isValid = true;

    if (rules) {
      const val = value;
  
      if (rules.type) {
        const t = String(rules.type).toLowerCase();
        if (t === 'number') isValid = typeof val === 'number';
        else if (t === 'string') isValid = typeof val === 'string';
        else if (t === 'boolean') isValid = typeof val === 'boolean';
        else if (t === 'object') isValid = typeof val === 'object' && val !== null;
        else if (t === 'array') isValid = Array.isArray(val);
      }
  
      if (isValid && Array.isArray(rules.allowedValues)) {
        isValid = rules.allowedValues.some((x) => x === val);
      }
  
      if (isValid && typeof val === 'number') {
        if (typeof rules.min === 'number' && val < rules.min) isValid = false;
        if (typeof rules.max === 'number' && val > rules.max) isValid = false;
      }
  
      if (isValid && typeof val === 'string') {
        if (typeof rules.minLength === 'number' && val.length < rules.minLength) isValid = false;
        if (typeof rules.maxLength === 'number' && val.length > rules.maxLength) isValid = false;
        if (rules.pattern) {
          try {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(val)) isValid = false;
          } catch {
            // Invalid pattern: do not fail validation here
          }
        }
      }
    }

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: 'Değer doğrulaması başarısız'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Değer geçerli'
    });
  } catch (error) {
    console.error('Validate setting value error:', error);
    res.status(500).json({
      success: false,
      message: 'Değer doğrulanırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
    return;
  }
}