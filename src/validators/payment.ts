import Joi from 'joi';

// Deposit validation
export const depositSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .min(1)
    .max(10000)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.min': 'Minimum deposit amount is 1',
      'number.max': 'Maximum deposit amount is 10,000',
      'any.required': 'Amount is required',
    }),
  currency: Joi.string()
    .uppercase()
    .valid('TRY', 'USD', 'EUR')
    .default('TRY')
    .messages({
      'string.base': 'Currency must be a string',
      'any.only': 'Currency must be one of TRY, USD, EUR',
    }),
  paymentMethod: Joi.object({
    type: Joi.string()
      .valid('credit_card', 'bank_transfer', 'paypal', 'crypto', 'mobile_payment')
      .required()
      .messages({
        'string.base': 'Payment method type must be a string',
        'any.only': 'Invalid payment method type',
        'any.required': 'Payment method type is required',
      }),
    provider: Joi.string()
      .max(100)
      .messages({
        'string.base': 'Provider must be a string',
        'string.max': 'Provider name too long',
      }),
    cardNumber: Joi.when('type', {
      is: 'credit_card',
      then: Joi.string()
        .pattern(/^\d{13,19}$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid card number format',
          'any.required': 'Card number is required for credit card payments',
        }),
      otherwise: Joi.forbidden(),
    }),
    expiryMonth: Joi.when('type', {
      is: 'credit_card',
      then: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .required()
        .messages({
          'number.base': 'Expiry month must be a number',
          'number.min': 'Invalid expiry month',
          'number.max': 'Invalid expiry month',
          'any.required': 'Expiry month is required for credit card payments',
        }),
      otherwise: Joi.forbidden(),
    }),
    expiryYear: Joi.when('type', {
      is: 'credit_card',
      then: Joi.number()
        .integer()
        .min(new Date().getFullYear())
        .max(new Date().getFullYear() + 20)
        .required()
        .messages({
          'number.base': 'Expiry year must be a number',
          'number.min': 'Card has expired',
          'number.max': 'Invalid expiry year',
          'any.required': 'Expiry year is required for credit card payments',
        }),
      otherwise: Joi.forbidden(),
    }),
    cvv: Joi.when('type', {
      is: 'credit_card',
      then: Joi.string()
        .pattern(/^\d{3,4}$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid CVV format',
          'any.required': 'CVV is required for credit card payments',
        }),
      otherwise: Joi.forbidden(),
    }),
    accountNumber: Joi.when('type', {
      is: 'bank_transfer',
      then: Joi.string()
        .min(10)
        .max(30)
        .required()
        .messages({
          'string.min': 'Account number too short',
          'string.max': 'Account number too long',
          'any.required': 'Account number is required for bank transfers',
        }),
      otherwise: Joi.forbidden(),
    }),
    iban: Joi.when('type', {
      is: 'bank_transfer',
      then: Joi.string()
        .pattern(/^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/)
        .messages({
          'string.pattern.base': 'Invalid IBAN format',
        }),
      otherwise: Joi.forbidden(),
    }),
    paypalEmail: Joi.when('type', {
      is: 'paypal',
      then: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Invalid PayPal email format',
          'any.required': 'PayPal email is required',
        }),
      otherwise: Joi.forbidden(),
    }),
    cryptoAddress: Joi.when('type', {
      is: 'crypto',
      then: Joi.string()
        .min(26)
        .max(62)
        .required()
        .messages({
          'string.min': 'Invalid crypto address',
          'string.max': 'Invalid crypto address',
          'any.required': 'Crypto address is required',
        }),
      otherwise: Joi.forbidden(),
    }),
    cryptoCurrency: Joi.when('type', {
      is: 'crypto',
      then: Joi.string()
        .valid('BTC', 'ETH', 'USDT', 'BNB')
        .required()
        .messages({
          'any.only': 'Unsupported cryptocurrency',
          'any.required': 'Cryptocurrency type is required',
        }),
      otherwise: Joi.forbidden(),
    }),
  }).required(),
  description: Joi.string()
    .max(500)
    .default('Wallet deposit')
    .messages({
      'string.base': 'Description must be a string',
      'string.max': 'Description too long',
    }),
});

// Withdraw validation
export const withdrawSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.min': 'Minimum withdrawal amount is 10',
      'number.max': 'Maximum withdrawal amount is 5,000',
      'any.required': 'Amount is required',
    }),
  paymentMethod: Joi.object({
    type: Joi.string()
      .valid('bank_transfer', 'paypal', 'crypto')
      .required()
      .messages({
        'string.base': 'Payment method type must be a string',
        'any.only': 'Invalid payment method type for withdrawal',
        'any.required': 'Payment method type is required',
      }),
    bankAccount: Joi.when('type', {
      is: 'bank_transfer',
      then: Joi.object({
        accountNumber: Joi.string()
          .min(10)
          .max(30)
          .required()
          .messages({
            'string.min': 'Account number too short',
            'string.max': 'Account number too long',
            'any.required': 'Account number is required',
          }),
        bankName: Joi.string()
          .min(2)
          .max(100)
          .required()
          .messages({
            'string.min': 'Bank name too short',
            'string.max': 'Bank name too long',
            'any.required': 'Bank name is required',
          }),
        accountHolderName: Joi.string()
          .min(2)
          .max(100)
          .required()
          .messages({
            'string.min': 'Account holder name too short',
            'string.max': 'Account holder name too long',
            'any.required': 'Account holder name is required',
          }),
        iban: Joi.string()
          .pattern(/^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/)
          .messages({
            'string.pattern.base': 'Invalid IBAN format',
          }),
        swiftCode: Joi.string()
          .pattern(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
          .messages({
            'string.pattern.base': 'Invalid SWIFT code format',
          }),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
    paypalEmail: Joi.when('type', {
      is: 'paypal',
      then: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Invalid PayPal email format',
          'any.required': 'PayPal email is required',
        }),
      otherwise: Joi.forbidden(),
    }),
    cryptoAddress: Joi.when('type', {
      is: 'crypto',
      then: Joi.string()
        .min(26)
        .max(62)
        .required()
        .messages({
          'string.min': 'Invalid crypto address',
          'string.max': 'Invalid crypto address',
          'any.required': 'Crypto address is required',
        }),
      otherwise: Joi.forbidden(),
    }),
    cryptoCurrency: Joi.when('type', {
      is: 'crypto',
      then: Joi.string()
        .valid('BTC', 'ETH', 'USDT', 'BNB')
        .required()
        .messages({
          'any.only': 'Unsupported cryptocurrency',
          'any.required': 'Cryptocurrency type is required',
        }),
      otherwise: Joi.forbidden(),
    }),
  }).required(),
  description: Joi.string()
    .max(500)
    .default('Wallet withdrawal')
    .messages({
      'string.base': 'Description must be a string',
      'string.max': 'Description too long',
    }),
});

// Transfer validation
export const transferSchema = Joi.object({
  toUserId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'Recipient user ID is required',
    }),
  amount: Joi.number()
    .positive()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.min': 'Minimum transfer amount is 1',
      'number.max': 'Maximum transfer amount is 1,000',
      'any.required': 'Amount is required',
    }),
  description: Joi.string()
    .max(500)
    .default('Wallet transfer')
    .messages({
      'string.base': 'Description must be a string',
      'string.max': 'Description too long',
    }),
});

// Transaction history validation
export const transactionHistorySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  type: Joi.string()
    .valid('deposit', 'withdraw', 'gift_sent', 'gift_received', 'subscription', 'commission', 'refund', 'penalty', 'bonus')
    .messages({
      'any.only': 'Invalid transaction type',
    }),
  status: Joi.string()
    .valid('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')
    .messages({
      'any.only': 'Invalid transaction status',
    }),
  startDate: Joi.date()
    .iso()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format',
    }),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date',
    }),
  paymentMethod: Joi.string()
    .valid('credit_card', 'bank_transfer', 'paypal', 'crypto', 'mobile_payment', 'wallet', 'gift_card')
    .messages({
      'any.only': 'Invalid payment method',
    }),
});

// Wallet settings validation
export const walletSettingsSchema = Joi.object({
  withdrawalSettings: Joi.object({
    autoWithdraw: Joi.boolean()
      .messages({
        'boolean.base': 'Auto withdraw must be a boolean',
      }),
    autoWithdrawThreshold: Joi.number()
      .positive()
      .min(10)
      .max(1000)
      .messages({
        'number.base': 'Auto withdraw threshold must be a number',
        'number.positive': 'Auto withdraw threshold must be positive',
        'number.min': 'Minimum auto withdraw threshold is 10',
        'number.max': 'Maximum auto withdraw threshold is 1,000',
      }),
    preferredPaymentMethod: Joi.string()
      .valid('bank_transfer', 'paypal', 'crypto')
      .messages({
        'any.only': 'Invalid preferred payment method',
      }),
    bankAccount: Joi.object({
      accountNumber: Joi.string()
        .min(10)
        .max(30)
        .messages({
          'string.min': 'Account number too short',
          'string.max': 'Account number too long',
        }),
      bankName: Joi.string()
        .min(2)
        .max(100)
        .messages({
          'string.min': 'Bank name too short',
          'string.max': 'Bank name too long',
        }),
      accountHolderName: Joi.string()
        .min(2)
        .max(100)
        .messages({
          'string.min': 'Account holder name too short',
          'string.max': 'Account holder name too long',
        }),
      iban: Joi.string()
        .pattern(/^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/)
        .messages({
          'string.pattern.base': 'Invalid IBAN format',
        }),
      swiftCode: Joi.string()
        .pattern(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
        .messages({
          'string.pattern.base': 'Invalid SWIFT code format',
        }),
    }),
    paypalEmail: Joi.string()
      .email()
      .messages({
        'string.email': 'Invalid PayPal email format',
      }),
    cryptoAddress: Joi.string()
      .min(26)
      .max(62)
      .messages({
        'string.min': 'Invalid crypto address',
        'string.max': 'Invalid crypto address',
      }),
  }),
  dailyWithdrawLimit: Joi.number()
    .positive()
    .min(10)
    .max(10000)
    .messages({
      'number.base': 'Daily withdraw limit must be a number',
      'number.positive': 'Daily withdraw limit must be positive',
      'number.min': 'Minimum daily withdraw limit is 10',
      'number.max': 'Maximum daily withdraw limit is 10,000',
    }),
  monthlyWithdrawLimit: Joi.number()
    .positive()
    .min(100)
    .max(100000)
    .messages({
      'number.base': 'Monthly withdraw limit must be a number',
      'number.positive': 'Monthly withdraw limit must be positive',
      'number.min': 'Minimum monthly withdraw limit is 100',
      'number.max': 'Maximum monthly withdraw limit is 100,000',
    }),
});

// Transaction stats validation
export const transactionStatsSchema = Joi.object({
  period: Joi.string()
    .valid('daily', 'weekly', 'monthly', 'yearly', 'all')
    .default('monthly')
    .messages({
      'any.only': 'Invalid period. Must be one of: daily, weekly, monthly, yearly, all',
    }),
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid user ID format',
    }),
});

// Admin transaction validation
export const adminTransactionSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  type: Joi.string()
    .valid('deposit', 'withdraw', 'gift_sent', 'gift_received', 'subscription', 'commission', 'refund', 'penalty', 'bonus')
    .messages({
      'any.only': 'Invalid transaction type',
    }),
  status: Joi.string()
    .valid('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')
    .messages({
      'any.only': 'Invalid transaction status',
    }),
  paymentMethod: Joi.string()
    .valid('credit_card', 'bank_transfer', 'paypal', 'crypto', 'mobile_payment', 'wallet', 'gift_card')
    .messages({
      'any.only': 'Invalid payment method',
    }),
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid user ID format',
    }),
  minAmount: Joi.number()
    .positive()
    .messages({
      'number.base': 'Minimum amount must be a number',
      'number.positive': 'Minimum amount must be positive',
    }),
  maxAmount: Joi.number()
    .positive()
    .min(Joi.ref('minAmount'))
    .messages({
      'number.base': 'Maximum amount must be a number',
      'number.positive': 'Maximum amount must be positive',
      'number.min': 'Maximum amount must be greater than minimum amount',
    }),
});

// Parameter validation schemas
export const transactionIdParamSchema = Joi.object({
  transactionId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid transaction ID format',
      'any.required': 'Transaction ID is required',
    }),
});

export const walletIdParamSchema = Joi.object({
  walletId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid wallet ID format',
      'any.required': 'Wallet ID is required',
    }),
});