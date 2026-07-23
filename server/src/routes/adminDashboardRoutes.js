import { Router } from 'express';
import {
  getLowStock,
  getOverview,
  getRevenueStats,
  getTopProducts,
} from '../controllers/adminDashboardController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('ADMIN'));

router.get('/overview', getOverview);
router.get('/revenue', getRevenueStats);
router.get('/top-products', getTopProducts);
router.get('/low-stock', getLowStock);

export default router;
