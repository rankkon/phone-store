import { Router } from 'express';
import { changePassword, deleteAvatar, forgotPassword, getMe, login, logout, refreshToken, register, resendRegistrationVerificationCode, resetPassword, sendEmailVerificationCode, sendPasswordChangeCode, updateProfile, uploadAvatar, verifyEmail, verifyRegistration } from '../controllers/authController.js';
import { requireAuth, requireEmailVerificationToken } from '../middlewares/auth.js';
import { authRateLimiter, emailCodeRateLimiter } from '../middlewares/rateLimit.js';
import { avatarImageUpload } from '../middlewares/upload.js';

const router = Router();
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/verify-registration', emailCodeRateLimiter, requireEmailVerificationToken, verifyRegistration);
router.post('/resend-registration-verification-code', emailCodeRateLimiter, requireEmailVerificationToken, resendRegistrationVerificationCode);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, updateProfile);
router.put('/avatar', requireAuth, avatarImageUpload.single('avatar'), uploadAvatar);
router.delete('/avatar', requireAuth, deleteAvatar);
router.post('/email-verification-code', requireAuth, emailCodeRateLimiter, sendEmailVerificationCode);
router.post('/verify-email', requireAuth, emailCodeRateLimiter, verifyEmail);
router.post('/password-change-code', requireAuth, emailCodeRateLimiter, sendPasswordChangeCode);
router.patch('/change-password', requireAuth, emailCodeRateLimiter, changePassword);

export default router;
