import mongoose from 'mongoose';
import Product from '../models/Product.js';
import StockAdjustment from '../models/StockAdjustment.js';
import { recordStockAdjustment } from '../services/stockHistoryService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateFreeText } from '../utils/inputValidation.js';

function requireProductAndVariantId(productId, variantId) {
  if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId)) {
    throw new ApiError(400, 'Mã sản phẩm hoặc biến thể không hợp lệ.');
  }
}

function parseStock(value, label, { min = 0 } = {}) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < min || quantity > 1000000) {
    throw new ApiError(400, `${label} phải là số nguyên từ ${min} đến 1.000.000.`);
  }
  return quantity;
}

export const getVariantStockHistory = asyncHandler(async (req, res) => {
  requireProductAndVariantId(req.params.id, req.params.variantId);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = { productId: req.params.id, variantId: req.params.variantId };
  const [total, adjustments] = await Promise.all([
    StockAdjustment.countDocuments(filter),
    StockAdjustment.find(filter).populate('changedBy', 'fullName email role').sort('-createdAt').skip((page - 1) * limit).limit(limit),
  ]);
  res.json({ data: adjustments, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

export const adjustVariantStock = asyncHandler(async (req, res) => {
  const { id, variantId } = req.params;
  requireProductAndVariantId(id, variantId);
  const { mode } = req.body;
  if (!['IMPORT', 'SET'].includes(mode)) throw new ApiError(400, 'Kiểu điều chỉnh tồn kho không hợp lệ.');

  const quantity = parseStock(req.body.quantity, mode === 'IMPORT' ? 'Số lượng nhập thêm' : 'Số lượng tồn kho mới', { min: mode === 'IMPORT' ? 1 : 0 });
  const reason = validateFreeText(req.body.reason, 'Nguyên nhân điều chỉnh', { required: true, minLength: 3, maxLength: 1000 });
  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  const variant = product.variants.id(variantId);
  if (!variant) throw new ApiError(404, 'Không tìm thấy biến thể sản phẩm.');

  const previousStock = variant.stock;
  const resultingStock = mode === 'IMPORT' ? previousStock + quantity : quantity;
  const change = resultingStock - previousStock;
  if (change === 0) throw new ApiError(400, 'Số lượng tồn kho mới không có thay đổi.');

  variant.stock = resultingStock;
  await product.save();
  const adjustment = await recordStockAdjustment({
    product,
    variant,
    type: mode === 'IMPORT' ? 'IMPORT' : 'ADJUSTMENT',
    change,
    previousStock,
    resultingStock,
    reason,
    changedBy: req.user._id,
  });
  await adjustment.populate('changedBy', 'fullName email role');
  res.json({ message: 'Đã cập nhật tồn kho và ghi nhận lịch sử điều chỉnh.', data: { product, adjustment } });
});
