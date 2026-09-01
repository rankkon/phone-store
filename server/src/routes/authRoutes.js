import { Router } from 'express';
import { changePassword, deleteAvatar, forgotPassword, getMe, login, logout, refreshToken, register, resetPassword, sendEmailVerificationCode, sendPasswordChangeCode, updateProfile, uploadAvatar, verifyEmail } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { authRateLimiter, emailCodeRateLimiter } from '../middlewares/rateLimit.js';
import { avatarImageUpload } from '../middlewares/upload.js';

const router = Router();
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
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
