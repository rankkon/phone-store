import { Router } from 'express';
import { changePassword, forgotPassword, getMe, login, logout, refreshToken, register, resetPassword, sendEmailVerificationCode, sendPasswordChangeCode, updateProfile, verifyEmail } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, updateProfile);
router.post('/email-verification-code', requireAuth, sendEmailVerificationCode);
router.post('/verify-email', requireAuth, verifyEmail);
router.post('/password-change-code', requireAuth, sendPasswordChangeCode);
router.patch('/change-password', requireAuth, changePassword);

export default router;
