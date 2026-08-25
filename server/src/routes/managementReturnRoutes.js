import { Router } from 'express';
import { getReturnRequests, updateReturnRequestStatus } from '../controllers/managementReturnController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('ADMIN', 'STAFF'));
router.get('/', getReturnRequests);
router.patch('/:id/status', updateReturnRequestStatus);

export default router;
