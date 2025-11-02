import { register } from './register';
import { login } from './login';
import { refreshToken } from './refreshToken';
import { logout } from './logout';
import { verifyEmail } from './verifyEmail';
import { resendVerification } from './resendVerification';
import { resendVerificationPublic } from './resendVerificationPublic';
import { forgotPassword } from './forgotPassword';
import { resetPassword } from './resetPassword';
import { changePassword } from './changePassword';
import { getProfile } from './getProfile';
import { validateResetToken } from './validateResetToken';
import { registerAdmin } from './registerAdmin';
import { acceptAdminInvite } from './acceptAdminInvite';

export const AuthController = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  resendVerificationPublic,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  validateResetToken,
  registerAdmin,
  acceptAdminInvite,
};

export {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  resendVerificationPublic,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  validateResetToken,
  registerAdmin,
  acceptAdminInvite,
};