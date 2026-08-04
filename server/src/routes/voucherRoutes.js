import { Router } from 'express';
import { getAvailableVouchers, validateVoucher } from '../controllers/voucherController.js';
import { allowRoles, requireAuth, requireVerifiedEmail } from '../middlewares/auth.js';

const router = Router();
router.get('/available', requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail, getAvailableVouchers);
router.post('/validate', requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail, validateVoucher);
export default router;
