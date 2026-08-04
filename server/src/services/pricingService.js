import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Voucher from '../models/Voucher.js';
import { ApiError } from '../utils/ApiError.js';

function withSession(query, session) {
  return session ? query.session(session) : query;
}

export function calculateDiscount(voucher, subtotal) {
  if (!voucher) return 0;
  let discount = voucher.type === 'PERCENT'
    ? Math.floor((subtotal * voucher.value) / 100)
    : voucher.value;
  if (voucher.maxDiscount !== null && voucher.maxDiscount !== undefined) discount = Math.min(discount, voucher.maxDiscount);
  return Math.min(discount, subtotal);
}

export function calculatePricing(subtotal, voucher) {
  const discount = calculateDiscount(voucher, subtotal);
  const amountAfterDiscount = subtotal - discount;
  const standardFee = Number(process.env.DEFAULT_SHIPPING_FEE || 30000);
  const freeShippingThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD || 15000000);
  const shippingFee = amountAfterDiscount >= freeShippingThreshold ? 0 : standardFee;
  return { subtotal, discount, shippingFee, total: amountAfterDiscount + shippingFee };
}

export async function getValidVoucher(code, subtotal, session) {
  if (!code?.trim()) return null;
  const voucher = await withSession(Voucher.findOne({ code: code.trim().toUpperCase() }), session);
  if (!voucher || !voucher.isActive) throw new ApiError(400, 'Voucher không tồn tại hoặc đã bị tắt.');

  const now = new Date();
  if (voucher.startAt > now) throw new ApiError(400, 'Voucher chưa đến thời gian sử dụng.');
  if (voucher.endAt < now) throw new ApiError(400, 'Voucher đã hết hạn.');
  if (voucher.usedCount >= voucher.usageLimit) throw new ApiError(400, 'Voucher đã hết lượt sử dụng.');
  if (subtotal < voucher.minOrderValue) throw new ApiError(400, `Đơn hàng cần đạt tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} VND để dùng voucher này.`);
  return voucher;
}

export async function getCartDetails(userId, session) {
  const cart = await withSession(Cart.findOne({ userId }).lean(), session);
  if (!cart || cart.items.length === 0) return { cart: cart || { userId, items: [] }, items: [], subtotal: 0 };

  const productIds = [...new Set(cart.items.map((item) => item.productId.toString()))];
  const products = await withSession(Product.find({ _id: { $in: productIds } }).lean(), session);
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const items = cart.items.map((item) => {
    const product = productMap.get(item.productId.toString());
    const variant = product?.variants.find((candidate) => candidate._id.toString() === item.variantId.toString());
    const available = Boolean(product?.isActive && variant?.isActive && variant.stock > 0);
    return {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: product ? { _id: product._id, name: product.name, slug: product.slug, modelCode: product.modelCode, imageUrl: product.images[0]?.url || '' } : null,
      // costPrice chỉ phục vụ tạo snapshot đơn hàng ở backend, không được gửi ra API giỏ hàng.
      variant: variant ? { _id: variant._id, sku: variant.sku, ram: variant.ram, storage: variant.storage, color: variant.color, costPrice: variant.costPrice, salePrice: variant.salePrice, stock: variant.stock, isActive: variant.isActive } : null,
      available,
      lineTotal: available ? variant.salePrice * item.quantity : 0,
    };
  });

  return { cart, items, subtotal: items.reduce((total, item) => total + item.lineTotal, 0) };
}
