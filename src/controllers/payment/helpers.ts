import type { PrismaClient } from '../../generated/prisma';

// Yardımcı metotlar: ödeme simülasyonu
export const getPaymentSuccessRate = (paymentType: string): number => {
  const rates: { [key: string]: number } = {
    credit_card: 0.95,
    bank_transfer: 0.98,
    paypal: 0.97,
    crypto: 0.90,
    mobile_payment: 0.93,
  };
  return rates[paymentType] || 0.85;
};

// processPayment
export const processPayment = async (
  client: PrismaClient,
  transactionId: string,
  paymentMethod: { type?: string }
): Promise<void> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const successRate = getPaymentSuccessRate(paymentMethod?.type ?? '');
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      await client.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
      });
    } else {
      await client.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED', adminNotes: 'Payment processing failed' },
      });
    }
  } catch {
    await client.transaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED', adminNotes: 'Payment processing error' },
    });
  }
};