import { Router } from 'express';
import { getUsers, updateUserRole, updateUserStatus, createUser, getUserLtv, exportUsersCsv, updateUserProfile } from '../controllers/adminUserController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('ADMIN'));

router.get('/', getUsers);
router.get('/export', exportUsersCsv);
router.post('/', createUser);
router.get('/:id/ltv', getUserLtv);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/role', updateUserRole);
router.patch('/:id', updateUserProfile);

export default router;
