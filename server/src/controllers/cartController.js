import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { getCartDetails } from '../services/pricingService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function parseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError(400, 'Số lượng phải là số nguyên từ 1 trở lên.');
  return quantity;
}

async function sendCart(res, userId, message) {
  const cartData = await getCartDetails(userId);
  const items = cartData.items.map(({ variant, ...item }) => {
    if (!variant) return { ...item, variant: null };
    const { costPrice, ...publicVariant } = variant;
    return { ...item, variant: publicVariant };
  });
  res.json({
    ...(message ? { message } : {}),
    data: { items, pricing: { subtotal: cartData.subtotal } },
  });
}

export const getCart = asyncHandler(async (req, res) => {
  await sendCart(res, req.user._id);
});

export const addCartItem = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.body;
  const quantity = parseQuantity(req.body.quantity || 1);
  if (!productId || !variantId) throw new ApiError(400, 'productId và variantId là bắt buộc.');
  if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId)) {
    throw new ApiError(400, 'Sản phẩm hoặc biến thể không hợp lệ.');
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new ApiError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán.');
  const variant = product.variants.id(variantId);
  if (!variant || !variant.isActive) throw new ApiError(404, 'Biến thể không tồn tại hoặc đã ngừng bán.');
  if (variant.stock <= 0) throw new ApiError(400, 'Biến thể này đã hết hàng.');

  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) cart = new Cart({ userId: req.user._id, items: [] });
  const item = cart.items.find((candidate) => candidate.variantId.toString() === variantId);
  const nextQuantity = (item?.quantity || 0) + quantity;
  if (nextQuantity > variant.stock) throw new ApiError(400, `Chỉ còn ${variant.stock} sản phẩm trong kho.`);

  if (item) item.quantity = nextQuantity;
  else cart.items.push({ productId, variantId, quantity });
  await cart.save();
  await sendCart(res, req.user._id, 'Đã thêm sản phẩm vào giỏ hàng.');
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const quantity = parseQuantity(req.body.quantity);
  if (!mongoose.isValidObjectId(req.params.variantId)) throw new ApiError(400, 'Biến thể không hợp lệ.');
  const cart = await Cart.findOne({ userId: req.user._id });
  const item = cart?.items.find((candidate) => candidate.variantId.toString() === req.params.variantId);
  if (!item) throw new ApiError(404, 'Không tìm thấy sản phẩm trong giỏ hàng.');

  const product = await Product.findOne({ _id: item.productId, isActive: true });
  const variant = product?.variants.id(item.variantId);
  if (!variant || !variant.isActive) throw new ApiError(400, 'Biến thể này hiện không còn bán.');
  if (quantity > variant.stock) throw new ApiError(400, `Chỉ còn ${variant.stock} sản phẩm trong kho.`);

  item.quantity = quantity;
  await cart.save();
  await sendCart(res, req.user._id, 'Đã cập nhật giỏ hàng.');
});

export const removeCartItem = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.variantId)) throw new ApiError(400, 'Biến thể không hợp lệ.');
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) throw new ApiError(404, 'Giỏ hàng đang trống.');
  const previousLength = cart.items.length;
  cart.items = cart.items.filter((item) => item.variantId.toString() !== req.params.variantId);
  if (cart.items.length === previousLength) throw new ApiError(404, 'Không tìm thấy sản phẩm trong giỏ hàng.');
  await cart.save();
  await sendCart(res, req.user._id, 'Đã xóa sản phẩm khỏi giỏ hàng.');
});

export const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { items: [] } }, { upsert: true });
  await sendCart(res, req.user._id, 'Đã xóa toàn bộ giỏ hàng.');
});
