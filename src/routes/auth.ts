import { Router } from 'express';
import { AuthController } from '@/controllers/auth';
import { validate } from '../middleware/validation';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  resendVerificationPublicSchema,
} from '@/validators/auth';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// Adaptörler: Express RequestHandler uyumu ve Promise<void> dönüşü
const adapt =
  <R extends Request>(fn: (req: R, res: Response) => Promise<void | Response>) =>
    async (req: Request, res: Response): Promise<void> => {
      await (fn as (req: Request, res: Response) => Promise<void | Response>)(req, res);
    };

const adaptMw =
  <R extends Request>(mw: (req: R, res: Response, next: NextFunction) => void | Promise<void>) =>
    (req: Request, res: Response, next: NextFunction): void | Promise<void> =>
      (mw as (req: Request, res: Response, next: NextFunction) => void | Promise<void>)(req, res, next);

// Controller handler’larını adapt et
const registerHandler = adapt(AuthController.register);
const loginHandler = adapt(AuthController.login);
const refreshTokenHandler = adapt(AuthController.refreshToken);
const logoutHandler = adapt(AuthController.logout);
const verifyEmailHandler = adapt(AuthController.verifyEmail);
const resendVerificationHandler = adapt(AuthController.resendVerification);
const resendVerificationPublicHandler = adapt(AuthController.resendVerificationPublic);
const forgotPasswordHandler = adapt(AuthController.forgotPassword);
const resetPasswordHandler = adapt(AuthController.resetPassword);
const changePasswordHandler = adapt(AuthController.changePassword);
const getProfileHandler = adapt(AuthController.getProfile);
const validateResetTokenHandler = adapt(AuthController.validateResetToken);

// Middleware’leri adapt et
const authenticateMw = adaptMw(authenticate);
const optionalAuthMw = adaptMw(optionalAuth);

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - confirmPassword
 *         - displayName
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: '^[a-zA-Z0-9_]+$'
 *           example: 'john_doe'
 *         email:
 *           type: string
 *           format: email
 *           example: 'john@example.com'
 *         password:
 *           type: string
 *           minLength: 6
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'
 *           example: 'Password123'
 *         confirmPassword:
 *           type: string
 *           example: 'Password123'
 *         displayName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           example: 'John Doe'
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: '1990-01-01'
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           example: 'male'
 *         country:
 *           type: string
 *           maxLength: 100
 *           example: 'United States'
 *         city:
 *           type: string
 *           maxLength: 100
 *           example: 'New York'
 *         phone:
 *           type: string
 *           pattern: '^\+?[1-9]\d{1,14}$'
 *           example: '+1234567890'
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - identifier
 *         - password
 *       properties:
 *         identifier:
 *           type: string
 *           description: Username or email
 *           example: 'john_doe'
 *         password:
 *           type: string
 *           example: 'Password123'
 *         rememberMe:
 *           type: boolean
 *           default: false
 *           example: true
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: 'Login successful'
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *                 refreshToken:
 *                   type: string
 *                   example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validate(registerSchema), asyncHandler(registerHandler));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Account suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validate(loginSchema), asyncHandler(loginHandler));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Token refreshed successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(refreshTokenHandler));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Logout successful'
 */
router.post('/logout', optionalAuthMw, asyncHandler(logoutHandler));

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: 'abc123def456'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Email verified successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: '507f1f77bcf86cd799439011'
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Invalid or expired verification token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verify-email', validate(verifyEmailSchema), asyncHandler(verifyEmailHandler));

// Public: resend verification by email (no auth)
/**
 * @swagger
 * /api/auth/resend-verification-email:
 *   post:
 *     summary: Resend email verification link (public)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationPublicRequest'
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Verification email sent successfully'
 *       400:
 *         description: Validation or business error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/resend-verification-email', validate(resendVerificationPublicSchema), asyncHandler(resendVerificationPublicHandler));

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Verification email sent successfully'
 *       400:
 *         description: Email is already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/resend-verification', authenticateMw, asyncHandler(resendVerificationHandler));

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'john@example.com'
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'If an account with that email exists, a password reset link has been sent.'
 */
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(forgotPasswordHandler));

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 'abc123def456'
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'
 *                 example: 'NewPassword123'
 *               confirmPassword:
 *                 type: string
 *                 example: 'NewPassword123'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Password reset successfully'
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPasswordHandler));

/**
 * @swagger
 * /api/auth/reset-password/validate:
 *   get:
 *     summary: Validate reset token
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Password reset token
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Token invalid or expired
 */
router.get('/reset-password/validate', asyncHandler(validateResetTokenHandler));

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (authenticated user)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: 'OldPassword123'
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'
 *                 example: 'NewPassword123'
 *               confirmNewPassword:
 *                 type: string
 *                 example: 'NewPassword123'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Password changed successfully'
 *       400:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/change-password', authenticateMw, validate(changePasswordSchema), asyncHandler(changePasswordHandler));

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticateMw, asyncHandler(getProfileHandler));

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     ResendVerificationPublicRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: 'user@example.com'
 */