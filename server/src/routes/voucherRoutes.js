import { Router } from 'express';
import { validateVoucher } from '../controllers/voucherController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();
router.post('/validate', requireAuth, allowRoles('CUSTOMER'), validateVoucher);
export default router;
