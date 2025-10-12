import { deposit } from './deposit';
import { withdraw } from './withdraw';
import { transfer } from './transfer';
import { getTransactionHistory } from './getTransactionHistory';
import { getWallet } from './getWallet';
import { updateWalletSettings } from './updateWalletSettings';
import { getTransactionStats } from './getTransactionStats';
import { getAllTransactions } from './getAllTransactions';
import { getPendingTransactions } from './getPendingTransactions';
import { moderateTransaction } from './moderateTransaction';
import { getRevenueStats } from './getRevenueStats';

export const PaymentController = {
  deposit,
  withdraw,
  transfer,
  getTransactionHistory,
  getWallet,
  updateWalletSettings,
  getTransactionStats,
  getAllTransactions,
  getPendingTransactions,
  moderateTransaction,
  getRevenueStats,
};