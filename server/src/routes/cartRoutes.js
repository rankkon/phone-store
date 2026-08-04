import { Router } from 'express';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from '../controllers/cartController.js';
import { allowRoles, requireAuth, requireVerifiedEmail } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail);
router.get('/', getCart);
router.post('/items', addCartItem);
router.patch('/items/:variantId', updateCartItem);
router.delete('/items/:variantId', removeCartItem);
router.delete('/', clearCart);
export default router;
