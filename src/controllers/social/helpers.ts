export interface GiftConfig {
  name: string;
  icon: string;
  value: number; // coins (jeton)
  animation: string;
  xp?: number; // hediye başına verilecek XP (admin ayarlarında override edilebilir)
}

export function getGiftConfig(giftType: string): GiftConfig | undefined {
  const giftConfigs: Record<string, GiftConfig> = {
    rose: { name: 'Gül', icon: '🌹', value: 1, animation: 'rose-animation', xp: 1 },
    heart: { name: 'Kalp', icon: '❤️', value: 2, animation: 'heart-animation', xp: 1 },
    diamond: { name: 'Elmas', icon: '💎', value: 10, animation: 'diamond-animation', xp: 2 },
    crown: { name: 'Taç', icon: '👑', value: 50, animation: 'crown-animation', xp: 5 },
    car: { name: 'Araba', icon: '🚗', value: 100, animation: 'car-animation', xp: 10 },
    yacht: { name: 'Yat', icon: '🛥️', value: 500, animation: 'yacht-animation', xp: 20 },
    rocket: { name: 'Roket', icon: '🚀', value: 1000, animation: 'rocket-animation', xp: 30 },
    fireworks: { name: 'Havai Fişek', icon: '🎆', value: 200, animation: 'fireworks-animation', xp: 8 },
    rainbow: { name: 'Gökkuşağı', icon: '🌈', value: 150, animation: 'rainbow-animation', xp: 6 },
    unicorn: { name: 'Tek Boynuzlu At', icon: '🦄', value: 300, animation: 'unicorn-animation', xp: 12 },
    dragon: { name: 'Ejder', icon: '🐉', value: 800, animation: 'dragon-animation', xp: 25 },
    phoenix: { name: 'Anka Kuşu', icon: '🔥', value: 1200, animation: 'phoenix-animation', xp: 35 },
    galaxy: { name: 'Galaksi', icon: '🌌', value: 2000, animation: 'galaxy-animation', xp: 50 },
    treasure: { name: 'Hazine', icon: '💰', value: 750, animation: 'treasure-animation', xp: 22 },
    castle: { name: 'Kale', icon: '🏰', value: 1500, animation: 'castle-animation', xp: 40 },
    throne: { name: 'Taht', icon: '🪑', value: 3000, animation: 'throne-animation', xp: 60 },
    meteor: { name: 'Meteor', icon: '☄️', value: 5000, animation: 'meteor-animation', xp: 80 },
    comet: { name: 'Kuyruklu Yıldız', icon: '☄️', value: 7500, animation: 'comet-animation', xp: 100 },
    star: { name: 'Yıldız', icon: '⭐', value: 10000, animation: 'star-animation', xp: 120 },
  };

  return giftConfigs[giftType];
}