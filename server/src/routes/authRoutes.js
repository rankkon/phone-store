import { Router } from 'express';
import { changePassword, getMe, login, logout, register, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, updateProfile);
router.patch('/change-password', requireAuth, changePassword);

export default router;
