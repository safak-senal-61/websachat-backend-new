import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';

// Routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import liveRoutes from '@/routes/live';
import socialRoutes from '@/routes/social';
import paymentRoutes from '@/routes/payment';
import moderationRoutes from '@/routes/moderation';
import analyticsRoutes from '@/routes/analytics';
import systemSettingsRoutes from '@/routes/systemSettings';
import adminRoutes from '@/routes/admin';
import chatRoutes from '@/routes/chat';
import conversationsRoutes from '@/routes/conversations';
import roomsRoutes from '@/routes/rooms';

// Socket handlers
import { setupSocketHandlers } from '@/sockets';

// Swagger
import { setupSwagger } from '@/config/swagger';

// Pages
import { resetPasswordPage, verifyEmailPage } from '@/pages';

// Load environment variables
dotenv.config();

// Birden fazla origin desteği: .env'deki CLIENT_URL değerlerini virgülle böl
const CLIENT_URLS = (process.env.CLIENT_URL ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Tüm origin'lere izin ver
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

const PORT = Number(process.env.PORT) || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Tüm origin'lere izin ver (development için)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Password reset page (modular)
app.get('/reset-password', resetPasswordPage);

// Email verification page (modular)
app.get('/verify-email', verifyEmailPage);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/rooms', roomsRoutes);

// Setup Swagger documentation
setupSwagger(app);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Health check: http://192.168.2.55:${PORT}/health`);
  logger.info(`API Documentation: http://192.168.2.55:${PORT}/api-docs`);
});