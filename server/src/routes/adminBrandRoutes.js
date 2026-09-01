import { Router } from 'express';
import { createBrand, getAdminBrands, updateBrand, updateBrandStatus, uploadBrandLogo } from '../controllers/brandController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';
import { brandLogoUpload } from '../middlewares/upload.js';

const router = Router();
router.use(requireAuth, allowRoles('ADMIN'));
router.route('/').get(getAdminBrands).post(createBrand);
router.post('/:id/logo', brandLogoUpload.single('logo'), uploadBrandLogo);
router.patch('/:id', updateBrand);
router.patch('/:id/status', updateBrandStatus);
export default router;
