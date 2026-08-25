import { Router } from 'express';
import { addFavorite, getFavorites, removeFavorite } from '../controllers/favoriteController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('CUSTOMER'));
router.get('/', getFavorites);
router.post('/', addFavorite);
router.delete('/:productId', removeFavorite);

export default router;
