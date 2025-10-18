/**
 * Para birimi dönüşüm yardımcı fonksiyonları
 */

/**
 * Kuruş cinsinden değeri TL formatına çevirir
 * @param kurus - Kuruş cinsinden değer
 * @returns TL formatında string (örn: "0.25", "1.00", "100.00")
 */
export function kurusToTL(kurus: number): string {
  const tl = kurus / 100;
  return tl.toFixed(2);
}

/**
 * TL cinsinden değeri kuruş formatına çevirir
 * @param tl - TL cinsinden değer
 * @returns Kuruş cinsinden integer değer
 */
export function tlToKurus(tl: number): number {
  return Math.round(tl * 100);
}

/**
 * Elmas bakiyesini TL formatında gösterir
 * @param diamonds - Elmas bakiyesi (kuruş cinsinden saklanır)
 * @returns TL formatında string
 */
export function formatDiamondBalance(diamonds: number): string {
  return kurusToTL(diamonds);
}

/**
 * Para formatını Türk Lirası olarak gösterir
 * @param amount - Miktar
 * @returns Formatlanmış string (örn: "₺0.25", "₺1.00")
 */
export function formatTurkishLira(amount: number): string {
  return `₺${kurusToTL(amount)}`;
}