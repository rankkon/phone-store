import { Router } from 'express';
import {
  approveCancelOrder,
  getOrderById,
  getOrders,
  rejectCancelOrder,
  updateOrderStatus,
  exportOrdersCsv,
  updateOrderPaymentStatus,
  createOfflineOrder,
  lookupCustomer,
} from '../controllers/managementOrderController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('ADMIN', 'STAFF'));

router.get('/', getOrders);
router.get('/export', exportOrdersCsv);
router.get('/customer-lookup', lookupCustomer);
router.post('/offline', createOfflineOrder);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/payment-status', updateOrderPaymentStatus);
router.post('/:id/cancel/approve', approveCancelOrder);
router.post('/:id/cancel/reject', rejectCancelOrder);

export default router;
