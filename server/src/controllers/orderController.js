import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Voucher from '../models/Voucher.js';
import { calculatePricing, getCartDetails, getValidVoucher } from '../services/pricingService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const addressFields = ['recipientName', 'phone', 'province', 'district', 'ward', 'detail'];

function withSession(query, session) {
  return session ? query.session(session) : query;
}

function buildOrderCode() {
  return `PS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function normalizeAddress(rawAddress) {
  if (!rawAddress || typeof rawAddress !== 'object') throw new ApiError(400, 'Vui lòng nhập đầy đủ địa chỉ nhận hàng.');
  const address = {};
  for (const field of addressFields) {
    if (!rawAddress[field]?.trim()) throw new ApiError(400, 'Vui lòng nhập đầy đủ địa chỉ nhận hàng.');
    address[field] = rawAddress[field].trim();
  }
  return address;
}

async function transactionSupported() {
  const serverInfo = await mongoose.connection.db.admin().command({ hello: 1 });
  return Boolean(serverInfo.setName || serverInfo.msg === 'isdbgrid');
}

async function createOrder(userId, { shippingAddress, note, voucherCode }, session) {
  const cartData = await getCartDetails(userId, session);
  if (cartData.items.length === 0) throw new ApiError(400, 'Giỏ hàng đang trống.');
  if (cartData.items.some((item) => !item.available || item.quantity > item.variant.stock)) {
    throw new ApiError(400, 'Một hoặc nhiều sản phẩm không đủ tồn kho. Vui lòng cập nhật giỏ hàng.');
  }

  const voucher = await getValidVoucher(voucherCode, cartData.subtotal, session);
  const pricing = calculatePricing(cartData.subtotal, voucher);
  const orderItems = cartData.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    productName: item.product.name,
    modelCode: item.product.modelCode,
    sku: item.variant.sku,
    ram: item.variant.ram,
    storage: item.variant.storage,
    color: item.variant.color,
    imageUrl: item.product.imageUrl,
    unitPrice: item.variant.price,
    quantity: item.quantity,
    lineTotal: item.variant.price * item.quantity,
  }));

  if (voucher) {
    const voucherUpdate = await withSession(Voucher.updateOne(
      { _id: voucher._id, isActive: true, usedCount: { $lt: voucher.usageLimit } },
      { $inc: { usedCount: 1 } },
    ), session);
    if (voucherUpdate.modifiedCount !== 1) throw new ApiError(400, 'Voucher đã hết lượt sử dụng.');
  }

  for (const item of orderItems) {
    const stockUpdate = await withSession(Product.updateOne(
      { _id: item.productId, isActive: true, variants: { $elemMatch: { _id: item.variantId, isActive: true, stock: { $gte: item.quantity } } } },
      { $inc: { 'variants.$.stock': -item.quantity } },
    ), session);
    if (stockUpdate.modifiedCount !== 1) throw new ApiError(400, 'Tồn kho vừa thay đổi. Vui lòng thử lại.');
  }

  const [order] = await Order.create([{
    orderCode: buildOrderCode(),
    userId,
    items: orderItems,
    shippingAddress,
    note: note?.trim() || '',
    pricing,
    voucher: voucher ? { code: voucher.code, type: voucher.type, value: voucher.value } : null,
    payment: { method: 'COD', status: 'UNPAID' },
    status: 'PENDING',
    statusHistory: [{ status: 'PENDING', note: 'Đơn hàng được tạo.', changedBy: userId }],
  }], session ? { session } : undefined);

  await withSession(Cart.deleteOne({ userId }), session);
  return order;
}

async function placeOrder(userId, payload) {
  if (!(await transactionSupported())) return createOrder(userId, payload, null);

  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      order = await createOrder(userId, payload, session);
    });
    return order;
  } finally {
    await session.endSession();
  }
}

export const createCodOrder = asyncHandler(async (req, res) => {
  if (req.body.paymentMethod && req.body.paymentMethod !== 'COD') {
    throw new ApiError(400, 'Hiện hệ thống chỉ hỗ trợ thanh toán COD.');
  }
  const shippingAddress = normalizeAddress(req.body.shippingAddress);
  const order = await placeOrder(req.user._id, { shippingAddress, note: req.body.note, voucherCode: req.body.voucherCode });
  res.status(201).json({ message: 'Đặt hàng thành công.', data: order });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = { userId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search?.trim()) filter.orderCode = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
  ]);
  res.json({ data: orders, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

export const getMyOrderByCode = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ userId: req.user._id, orderCode: req.params.orderCode });
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
  res.json({ data: order });
});
