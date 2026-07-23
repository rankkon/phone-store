import { Router } from 'express';
import { getUsers, updateUserRole, updateUserStatus } from '../controllers/adminUserController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('ADMIN'));

router.get('/', getUsers);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/role', updateUserRole);

export default router;
