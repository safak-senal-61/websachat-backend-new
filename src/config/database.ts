// import { PrismaClient } from '../generated/prisma';
import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

// Global Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance
const datasourceUrl =
  process.env.NODE_ENV === 'test'
    ? (process.env.DATABASE_URL_TEST || process.env.DATABASE_URL)
    : process.env.DATABASE_URL;

// Strict typings nedeniyle url’in kesin olarak string olduğundan emin ol
if (!datasourceUrl) {
  // Ortam değişkeni eksikse erken hata fırlat
  throw new Error('DATABASE_URL is not set. Please configure your environment variable.');
}

export const prisma = globalThis.__prisma || new PrismaClient({
  datasources: { db: { url: datasourceUrl } },
  log: [
    { level: 'error', emit: 'stdout' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected successfully via Prisma');
    
    // Query logging removed due to TypeScript compatibility issues

  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from PostgreSQL:', error);
    throw error;
  }
};