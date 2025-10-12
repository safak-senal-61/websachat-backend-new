// jwt.ts dosyasındaki JWTUtils tanımı (class olarak güncellendi)
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type JWTUserInput = {
  _id: string;
  username: string;
  email: string;
  role?: string;
};

export class JWTUtils {
  private static readonly ACCESS_TOKEN_SECRET: Secret = process.env.JWT_ACCESS_SECRET || 'access-secret-key';
  private static readonly REFRESH_TOKEN_SECRET: Secret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';

  private static parseExpiresToSeconds(value: string | number | undefined, fallbackSeconds: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // pure number string -> assume seconds
      if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
      const match = trimmed.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
      if (match) {
        const amountStr = match[1];
        const unitRaw = match[2];
        if (!amountStr || !unitRaw) {
          return fallbackSeconds;
        }
        const amount = parseInt(amountStr, 10);
        const unit = unitRaw.toLowerCase();
        switch (unit) {
        case 'ms':
          return Math.ceil(amount / 1000);
        case 's':
          return amount;
        case 'm':
          return amount * 60;
        case 'h':
          return amount * 60 * 60;
        case 'd':
          return amount * 60 * 60 * 24;
        }
      }
    }
    return fallbackSeconds;
  }

  private static getAccessTokenExpiresIn(): number {
    const envVal = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
    return this.parseExpiresToSeconds(envVal, 15 * 60);
  }

  private static getRefreshTokenExpiresIn(): number {
    const envVal = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
    return this.parseExpiresToSeconds(envVal, 7 * 24 * 60 * 60);
  }

  /**
   * Generate access token
   */
  static generateAccessToken(user: JWTUserInput): string {
    const payload: JWTPayload = {
      userId: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role ?? 'user',
    };

    const options: SignOptions = {
      expiresIn: this.getAccessTokenExpiresIn(),
      issuer: 'websachat-backend',
      audience: 'websachat-app',
    };

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, options);
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user: JWTUserInput): string {
    const payload: JWTPayload = {
      userId: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role ?? 'user',
    };

    const options: SignOptions = {
      expiresIn: this.getRefreshTokenExpiresIn(),
      issuer: 'websachat-backend',
      audience: 'websachat-app',
    };

    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, options);
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(user: JWTUserInput): TokenPair {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'websachat-backend',
        audience: 'websachat-app',
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        issuer: 'websachat-backend',
        audience: 'websachat-app',
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return expiration.getTime() < Date.now();
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] ?? null;
  }

  /**
   * Generate a secure random token for email verification, password reset, etc.
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}