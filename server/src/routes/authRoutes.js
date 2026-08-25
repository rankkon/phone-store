import { Router } from 'express';
import { changePassword, deleteAvatar, forgotPassword, getMe, login, logout, refreshToken, register, resetPassword, sendEmailVerificationCode, sendPasswordChangeCode, updateProfile, uploadAvatar, verifyEmail } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { avatarImageUpload } from '../middlewares/upload.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, updateProfile);
router.put('/avatar', requireAuth, avatarImageUpload.single('avatar'), uploadAvatar);
router.delete('/avatar', requireAuth, deleteAvatar);
router.post('/email-verification-code', requireAuth, sendEmailVerificationCode);
router.post('/verify-email', requireAuth, verifyEmail);
router.post('/password-change-code', requireAuth, sendPasswordChangeCode);
router.patch('/change-password', requireAuth, changePassword);

export default router;
