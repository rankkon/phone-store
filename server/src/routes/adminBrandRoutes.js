import { Router } from 'express';
import { createBrand, getAdminBrands, updateBrand, updateBrandStatus } from '../controllers/brandController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth, allowRoles('ADMIN'));
router.route('/').get(getAdminBrands).post(createBrand);
router.patch('/:id', updateBrand);
router.patch('/:id/status', updateBrandStatus);
export default router;
