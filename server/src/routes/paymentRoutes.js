import { Router } from 'express';
import { createVnpayPayment, retryVnpayPayment, vnpayReturn } from '../controllers/paymentController.js';
import { allowRoles, requireAuth, requireVerifiedEmail } from '../middlewares/auth.js';

const router = Router();

router.post('/vnpay/create', requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail, createVnpayPayment);
router.post('/vnpay/orders/:orderCode/retry', requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail, retryVnpayPayment);
router.get('/vnpay/return', vnpayReturn);

export default router;
