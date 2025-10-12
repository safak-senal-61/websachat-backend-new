// module scope (file-level)
import express from 'express';
import { PaymentController } from '../controllers/payment';
import { authenticate as auth, authorize } from '../middleware/auth';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import {
  depositSchema,
  withdrawSchema,
  transferSchema,
  transactionHistorySchema,
  walletSettingsSchema,
  transactionStatsSchema,
  adminTransactionSchema,
  transactionIdParamSchema,
} from '../validators/payment';

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Express adapter helpers: AuthRequest tabanlı handler/middleware’ları Express RequestHandler’a uyarlar
const adapt = (
  handler: (req: AuthRequest, res: Response) => unknown | Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req as AuthRequest, res)).catch(next);
};

const adaptMw = (
  mw: (req: AuthRequest, res: Response, next: NextFunction) => unknown | Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(mw(req as AuthRequest, res, next)).catch(next);
};

// Auth middleware’lerini uyarla (ilk kullanımdan önce tanımlı olmalı)
const authenticateMw: RequestHandler = adaptMw(auth);
const authorizeMw = (...roles: string[]): RequestHandler => adaptMw(authorize(...roles));

// Controller handler’ları uyarla (ilk kullanımdan önce tanımlı olmalı)
const depositHandler = adapt(PaymentController.deposit);
const withdrawHandler = adapt(PaymentController.withdraw);
const transferHandler = adapt(PaymentController.transfer);
const getTransactionHistoryHandler = adapt(PaymentController.getTransactionHistory);
const getWalletHandler = adapt(PaymentController.getWallet);
const updateWalletSettingsHandler = adapt(PaymentController.updateWalletSettings);
const getTransactionStatsHandler = adapt(PaymentController.getTransactionStats);

// Admin handlers
const getAllTransactionsHandler = adapt(PaymentController.getAllTransactions);
const getPendingTransactionsHandler = adapt(PaymentController.getPendingTransactions);
const moderateTransactionHandler = adapt(PaymentController.moderateTransaction);
const getRevenueStatsHandler = adapt(PaymentController.getRevenueStats);

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [credit_card, bank_transfer, paypal, crypto, mobile_payment]
 *         provider:
 *           type: string
 *         cardNumber:
 *           type: string
 *         expiryMonth:
 *           type: number
 *         expiryYear:
 *           type: number
 *         cvv:
 *           type: string
 *         accountNumber:
 *           type: string
 *         iban:
 *           type: string
 *         paypalEmail:
 *           type: string
 *         cryptoAddress:
 *           type: string
 *         cryptoCurrency:
 *           type: string
 *     
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user:
 *           type: string
 *         type:
 *           type: string
 *           enum: [deposit, withdraw, gift_sent, gift_received, subscription, commission, refund, penalty, bonus]
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, refunded]
 *         description:
 *           type: string
 *         reference:
 *           type: string
 *         paymentMethod:
 *           $ref: '#/components/schemas/PaymentMethod'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     Wallet:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user:
 *           type: string
 *         balance:
 *           type: number
 *         availableBalance:
 *           type: number
 *         pendingBalance:
 *           type: number
 *         frozenBalance:
 *           type: number
 *         currency:
 *           type: string
 *         limits:
 *           type: object
 *           properties:
 *             dailyWithdrawLimit:
 *               type: number
 *             monthlyWithdrawLimit:
 *               type: number
 *             minimumWithdrawAmount:
 *               type: number
 *             maximumWithdrawAmount:
 *               type: number
 *         withdrawalSettings:
 *           type: object
 *         stats:
 *           type: object
 *         security:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/payment/deposit:
 *   post:
 *     summary: Deposit money to wallet
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *               currency:
 *                 type: string
 *                 enum: [TRY, USD, EUR]
 *                 default: TRY
 *               paymentMethod:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Deposit initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *                     wallet:
 *                       type: object
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Wallet is locked
 *       500:
 *         description: Server error
 */
router.post('/deposit', authenticateMw, validate(depositSchema), depositHandler);

/**
 * @swagger
 * /api/payment/withdraw:
 *   post:
 *     summary: Withdraw money from wallet
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 10
 *                 maximum: 5000
 *               paymentMethod:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [bank_transfer, paypal, crypto]
 *                   bankAccount:
 *                     type: object
 *                   paypalEmail:
 *                     type: string
 *                   cryptoAddress:
 *                     type: string
 *                   cryptoCurrency:
 *                     type: string
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Withdrawal request submitted successfully
 *       400:
 *         description: Invalid request or insufficient balance
 *       403:
 *         description: Wallet is locked
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.post('/withdraw', authenticateMw, validate(withdrawSchema), withdrawHandler);

/**
 * @swagger
 * /api/payment/transfer:
 *   post:
 *     summary: Transfer money between wallets
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *               - amount
 *             properties:
 *               toUserId:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Transfer completed successfully
 *       400:
 *         description: Invalid request or insufficient balance
 *       404:
 *         description: Wallet or recipient not found
 *       500:
 *         description: Server error
 */
router.post('/transfer', authenticateMw, validate(transferSchema), transferHandler);

/**
 * @swagger
 * /api/payment/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdraw, gift_sent, gift_received, subscription, commission, refund, penalty, bonus]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, refunded]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [credit_card, bank_transfer, paypal, crypto, mobile_payment, wallet, gift_card]
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *                     pagination:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get('/transactions', authenticateMw, validateQuery(transactionHistorySchema), getTransactionHistoryHandler);

/**
 * @swagger
 * /api/payment/wallet:
 *   get:
 *     summary: Get wallet details
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallet:
 *                       $ref: '#/components/schemas/Wallet'
 *       500:
 *         description: Server error
 */
router.get('/wallet', authenticateMw, getWalletHandler);

/**
 * @swagger
 * /api/payment/wallet/settings:
 *   put:
 *     summary: Update wallet settings
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               withdrawalSettings:
 *                 type: object
 *                 properties:
 *                   autoWithdraw:
 *                     type: boolean
 *                   autoWithdrawThreshold:
 *                     type: number
 *                   preferredPaymentMethod:
 *                     type: string
 *                     enum: [bank_transfer, paypal, crypto]
 *                   bankAccount:
 *                     type: object
 *                   paypalEmail:
 *                     type: string
 *                   cryptoAddress:
 *                     type: string
 *               dailyWithdrawLimit:
 *                 type: number
 *                 minimum: 10
 *                 maximum: 10000
 *               monthlyWithdrawLimit:
 *                 type: number
 *                 minimum: 100
 *                 maximum: 100000
 *     responses:
 *       200:
 *         description: Wallet settings updated successfully
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.put('/wallet/settings', authenticateMw, validate(walletSettingsSchema), updateWalletSettingsHandler);

/**
 * @swagger
 * /api/payment/stats:
 *   get:
 *     summary: Get transaction statistics
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, all]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Transaction statistics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/stats', authenticateMw, validateQuery(transactionStatsSchema), getTransactionStatsHandler);

/**
 * @swagger
 * /api/payment/admin/transactions:
 *   get:
 *     summary: Get all transactions (Admin only)
 *     tags: [Payment - Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/admin/transactions',
  authenticateMw,
  authorizeMw('admin'),
  validateQuery(adminTransactionSchema),
  getAllTransactionsHandler
);

/**
 * @swagger
 * /api/payment/admin/transactions/pending:
 *   get:
 *     summary: Get pending transactions (Admin only)
 *     tags: [Payment - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pending transactions retrieved successfully
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get('/admin/transactions/pending', authenticateMw, authorizeMw('admin'), getPendingTransactionsHandler);

/**
 * @swagger
 * /api/payment/admin/transactions/{transactionId}/moderate:
 *   put:
 *     summary: Approve or reject transaction (Admin only)
 *     tags: [Payment - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Transaction moderated successfully
 *       400:
 *         description: Invalid action or transaction status
 *       403:
 *         description: Access denied
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.put('/admin/transactions/:transactionId/moderate', 
  authenticateMw, 
  authorizeMw('admin'), 
  validateParams(transactionIdParamSchema),
  moderateTransactionHandler
);

/**
 * @swagger
 * /api/payment/admin/revenue:
 *   get:
 *     summary: Get revenue statistics (Admin only)
 *     tags: [Payment - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, all]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Revenue statistics retrieved successfully
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get('/admin/revenue', authenticateMw, authorizeMw('admin'), validateQuery(transactionStatsSchema), getRevenueStatsHandler);

export default router;