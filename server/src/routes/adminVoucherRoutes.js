import { Router } from 'express';
import { createVoucher, deleteVoucher, getAdminVouchers, updateVoucher, updateVoucherStatus } from '../controllers/adminVoucherController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('ADMIN'));
router.route('/').get(getAdminVouchers).post(createVoucher);
router.patch('/:id', updateVoucher);
router.patch('/:id/status', updateVoucherStatus);
router.delete('/:id', deleteVoucher);

export default router;
