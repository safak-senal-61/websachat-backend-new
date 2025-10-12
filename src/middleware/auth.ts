import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from './errorHandler';
import { JWTUtils } from '@/utils/jwt';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Access token is required', 401);
    }

    const token = authHeader.substring(7);

    // Access token'ı JWTUtils ile doğrula (JWT_ACCESS_SECRET kullanır)
    const decoded = JWTUtils.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError('User not found', 401);
    }

    if (user.isBanned || !user.isActive) {
      throw createError('Account is blocked', 403);
    }

    const mergedRole = decoded.role ?? 'user';
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      isVerified: user.isVerified,
      isActive: user.isActive,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: mergedRole,
    };
    next();
  } catch (error) {
    next(createError('Invalid token', 401));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    // Access token'ı JWTUtils ile doğrula
    const decoded = JWTUtils.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user && !user.isBanned && user.isActive) {
      const mergedRole = decoded.role ?? 'user';
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isActive: user.isActive,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: mergedRole,
      };
    }

    next();
  } catch {
    // Opsiyonel auth: herhangi bir doğrulama hatasını yok say
    next();
  }
};