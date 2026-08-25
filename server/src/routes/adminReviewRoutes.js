import { Router } from 'express';
import { getAdminReviews, replyToReview, updateReviewVisibility } from '../controllers/adminReviewController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth, allowRoles('ADMIN'));
router.get('/', getAdminReviews);
router.patch('/:reviewId/visibility', updateReviewVisibility);
router.patch('/:reviewId/reply', replyToReview);

export default router;
