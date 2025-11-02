import { prisma } from "../config/database";
import { logger } from "../utils/logger";

export type LevelSettingsShape = {
  baseXpRequired: number; // Seviye 2 için gereken başlangıç XP
  xpMultiplier: number; // Seviye başına çarpan (ör: 1.1 => %10 artış)
  maxLevel: number; // Maksimum seviye sınırı
  levelRewards?: Record<string, { diamonds?: number; coins?: number }>; // Seviye ödülleri
};

type ThresholdCache = {
  settings: LevelSettingsShape;
  thresholds: number[]; // thresholds[lvl] = o seviyeye ulaşmak için gereken kümülatif XP
  lastLoadedAt: number;
};

let cache: ThresholdCache | null = null;

function buildThresholds(settings: LevelSettingsShape): number[] {
  // Level 1 başlayış için eşik 0, Level 2 için baseXpRequired, sonrakiler için çarpanlı artış
  const arr: number[] = [];
  arr[1] = 0;
  let requiredForNext = settings.baseXpRequired;
  let cumulative = 0;
  for (let lvl = 2; lvl <= settings.maxLevel; lvl++) {
    cumulative += Math.floor(requiredForNext);
    arr[lvl] = cumulative;
    requiredForNext = requiredForNext * settings.xpMultiplier;
  }
  return arr;
}

export async function loadLevelSettings(force = false): Promise<LevelSettingsShape> {
  if (cache && !force) return cache.settings;

  const row = await prisma.systemSetting.findUnique({ where: { key: "level_settings" } });
  let parsed: Partial<LevelSettingsShape> = {};
  const raw = row?.value as unknown;
  if (raw !== undefined && raw !== null) {
    if (typeof raw === 'string') {
      try {
        const maybe = JSON.parse(raw);
        if (maybe && typeof maybe === 'object') parsed = maybe as Partial<LevelSettingsShape>;
      } catch (err) {
        logger.warn("Level settings JSON parse failed, using defaults", { err });
      }
    } else if (typeof raw === 'object') {
      parsed = raw as Partial<LevelSettingsShape>;
    }
  }

  const settings: LevelSettingsShape = {
    baseXpRequired: parsed.baseXpRequired ?? 100,
    xpMultiplier: parsed.xpMultiplier ?? 1.1,
    maxLevel: parsed.maxLevel ?? 100,
    levelRewards: parsed.levelRewards ?? {},
  };

  cache = {
    settings,
    thresholds: buildThresholds(settings),
    lastLoadedAt: Date.now(),
  };

  return settings;
}

export function clearLevelCache(): void {
  cache = null;
}

export async function getThresholds(): Promise<number[]> {
  if (!cache) await loadLevelSettings();
  return cache!.thresholds;
}

export async function calculateLevelFromXp(xp: number): Promise<{
  level: number;
  nextLevelXp: number;
  currentLevelXp: number;
  xpIntoLevel: number;
}> {
  const settings = await loadLevelSettings();
  const th = await getThresholds();

  let level = 1;
  for (let l = 2; l <= settings.maxLevel; l++) {
    const threshold = th[l] ?? Number.MAX_SAFE_INTEGER;
    if (xp >= threshold) level = l;
    else break;
  }

  const currentLevelXp = th[level] ?? 0;
  const nextLevelXp = level < settings.maxLevel ? (th[level + 1] ?? th[level] ?? currentLevelXp) : (th[level] ?? currentLevelXp);
  const xpIntoLevel = Math.max(0, xp - currentLevelXp);

  return { level, nextLevelXp, currentLevelXp, xpIntoLevel };
}

export async function getLevelProgressForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true } });
  if (!user) return null;
  const { level, nextLevelXp, currentLevelXp, xpIntoLevel } = await calculateLevelFromXp(user.xp);
  return {
    xp: user.xp,
    level,
    nextLevelXpRequired: nextLevelXp - currentLevelXp,
    xpIntoLevel,
    currentLevelXp,
    nextLevelXp,
  };
}

export async function applyLevelUpRewards(userId: string, newLevel: number) {
  // Ödül tablosu string key ile tanımlanmış olabilir, hem string hem number dene
  const settings = await loadLevelSettings();
  const key = String(newLevel);
  const rewards = settings.levelRewards?.[key] ?? settings.levelRewards?.[newLevel as unknown as string] ?? undefined;
  if (!rewards) return { diamonds: 0, coins: 0 };

  const diamonds = Math.floor(rewards.diamonds ?? 0);
  const coins = Math.floor(rewards.coins ?? 0);

  if (diamonds || coins) {
    await prisma.virtualBalance.update({
      where: { userId },
      data: {
        diamonds: { increment: diamonds },
        coins: { increment: coins },
      },
    });
    logger.info("Applied level-up rewards", { userId, newLevel, diamonds, coins });
  }

  return { diamonds, coins };
}