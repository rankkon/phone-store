import { Router } from 'express';
import {
  approveCancelOrder,
  getOrderById,
  getOrders,
  rejectCancelOrder,
  updateOrderStatus,
} from '../controllers/managementOrderController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('ADMIN', 'STAFF'));

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/cancel/approve', approveCancelOrder);
router.post('/:id/cancel/reject', rejectCancelOrder);

export default router;
