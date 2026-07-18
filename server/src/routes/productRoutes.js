import { Router } from 'express';
import { getPublicProductBySlug, getPublicProducts } from '../controllers/productController.js';

const router = Router();
router.get('/', getPublicProducts);
router.get('/:slug', getPublicProductBySlug);
export default router;
