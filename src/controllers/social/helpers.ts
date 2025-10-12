export interface GiftConfig {
  name: string;
  icon: string;
  value: number;
  animation: string;
}

export function getGiftConfig(giftType: string): GiftConfig | undefined {
  const giftConfigs: Record<string, GiftConfig> = {
    rose: { name: 'Gül', icon: '🌹', value: 1, animation: 'rose-animation' },
    heart: { name: 'Kalp', icon: '❤️', value: 2, animation: 'heart-animation' },
    diamond: { name: 'Elmas', icon: '💎', value: 10, animation: 'diamond-animation' },
    crown: { name: 'Taç', icon: '👑', value: 50, animation: 'crown-animation' },
    car: { name: 'Araba', icon: '🚗', value: 100, animation: 'car-animation' },
    yacht: { name: 'Yat', icon: '🛥️', value: 500, animation: 'yacht-animation' },
    rocket: { name: 'Roket', icon: '🚀', value: 1000, animation: 'rocket-animation' },
    fireworks: { name: 'Havai Fişek', icon: '🎆', value: 200, animation: 'fireworks-animation' },
    rainbow: { name: 'Gökkuşağı', icon: '🌈', value: 150, animation: 'rainbow-animation' },
    unicorn: { name: 'Tek Boynuzlu At', icon: '🦄', value: 300, animation: 'unicorn-animation' },
    dragon: { name: 'Ejder', icon: '🐉', value: 800, animation: 'dragon-animation' },
    phoenix: { name: 'Anka Kuşu', icon: '🔥', value: 1200, animation: 'phoenix-animation' },
    galaxy: { name: 'Galaksi', icon: '🌌', value: 2000, animation: 'galaxy-animation' },
    treasure: { name: 'Hazine', icon: '💰', value: 750, animation: 'treasure-animation' },
    castle: { name: 'Kale', icon: '🏰', value: 1500, animation: 'castle-animation' },
    throne: { name: 'Taht', icon: '🪑', value: 3000, animation: 'throne-animation' },
    meteor: { name: 'Meteor', icon: '☄️', value: 5000, animation: 'meteor-animation' },
    comet: { name: 'Kuyruklu Yıldız', icon: '☄️', value: 7500, animation: 'comet-animation' },
    star: { name: 'Yıldız', icon: '⭐', value: 10000, animation: 'star-animation' },
  };

  return giftConfigs[giftType];
}