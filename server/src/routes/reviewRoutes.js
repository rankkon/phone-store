import { Router } from 'express';
import { createReview, getMyProductReview, getProductReviews, updateMyReview } from '../controllers/reviewController.js';
import { allowRoles, requireAuth, requireVerifiedEmail } from '../middlewares/auth.js';

const router = Router();

router.get('/', getProductReviews);
router.get('/mine', requireAuth, allowRoles('CUSTOMER'), getMyProductReview);
router.post('/', requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail, createReview);
router.patch('/:reviewId', requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail, updateMyReview);

export default router;
