import { Router } from 'express';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
