import { Router } from 'express';
import { getPublicBrands } from '../controllers/brandController.js';

const router = Router();
router.get('/', getPublicBrands);
export default router;
