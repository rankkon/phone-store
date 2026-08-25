import { Router } from 'express';
import {
  addVariant, createProduct, deleteProductImage, getAdminProduct, getAdminProducts, updateProduct, updateProductStatus, updateVariant, uploadProductImages,
} from '../controllers/productController.js';
import { adjustVariantStock, getVariantStockHistory } from '../controllers/inventoryController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';
import { productImageUpload } from '../middlewares/upload.js';

const router = Router();
router.use(requireAuth, allowRoles('ADMIN', 'STAFF'));
router.route('/').get(getAdminProducts).post(createProduct);
router.get('/:id', getAdminProduct);
router.patch('/:id', updateProduct);
router.patch('/:id/status', updateProductStatus);
router.post('/:id/images', productImageUpload.array('images', 5), uploadProductImages);
router.delete('/:id/images/:imageId', deleteProductImage);
router.post('/:id/variants', addVariant);
router.patch('/:id/variants/:variantId', updateVariant);
router.get('/:id/variants/:variantId/stock-history', allowRoles('ADMIN'), getVariantStockHistory);
router.patch('/:id/variants/:variantId/stock', allowRoles('ADMIN'), adjustVariantStock);
export default router;
