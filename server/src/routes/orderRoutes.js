import { Router } from 'express';
import { createCodOrder, getMyOrderByCode, getMyOrders, requestCancelOrder } from '../controllers/orderController.js';
import { allowRoles, requireAuth, requireVerifiedEmail } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail);
router.post('/', createCodOrder);
router.get('/my-orders', getMyOrders);
router.get('/my-orders/:orderCode', getMyOrderByCode);
router.post('/:id/cancel-request', requestCancelOrder);
export default router;

