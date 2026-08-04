import { calculatePricing, getCartDetails, getValidVoucher } from '../services/pricingService.js';
import Voucher from '../models/Voucher.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const validateVoucher = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const cartData = await getCartDetails(req.user._id);
  if (cartData.items.length === 0) throw new ApiError(400, 'Giỏ hàng đang trống.');
  if (cartData.items.some((item) => !item.available || item.quantity > item.variant.stock)) {
    throw new ApiError(400, 'Giỏ hàng có sản phẩm không còn hợp lệ. Vui lòng cập nhật giỏ hàng.');
  }

  const voucher = code?.trim() ? await getValidVoucher(code, cartData.subtotal) : null;
  const pricing = calculatePricing(cartData.subtotal, voucher);
  res.json({
    message: voucher ? 'Voucher hợp lệ.' : 'Đã cập nhật tạm tính.',
    data: {
      voucher: voucher ? { code: voucher.code, type: voucher.type, value: voucher.value } : null,
      pricing,
    },
  });
});

export const getAvailableVouchers = asyncHandler(async (req, res) => {
  const now = new Date();
  const vouchers = await Voucher.find({
    isActive: true,
    startAt: { $lte: now },
    endAt: { $gte: now },
    $expr: { $lt: ['$usedCount', '$usageLimit'] },
  }).sort({ endAt: 1, value: -1 });
  res.json({ data: vouchers });
});
