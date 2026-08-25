import { Router } from 'express';
import { createReturnRequest, getMyReturnRequestForOrder, getMyReturnRequests } from '../controllers/returnController.js';
import { allowRoles, requireAuth, requireVerifiedEmail } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth, allowRoles('CUSTOMER'), requireVerifiedEmail);
router.get('/my-returns', getMyReturnRequests);
router.get('/orders/:orderId', getMyReturnRequestForOrder);
router.post('/orders/:orderId', createReturnRequest);

export default router;
