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
};