import { Router } from 'express';
import { createVnpayPayment, vnpayReturn } from '../controllers/paymentController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/vnpay/create', requireAuth, allowRoles('CUSTOMER'), createVnpayPayment);
router.get('/vnpay/return', vnpayReturn);

export default router;
