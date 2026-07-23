import crypto from 'crypto';
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
  try {
    const serverInfo = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(serverInfo.setName || serverInfo.msg === 'isdbgrid');
  } catch {
    return false;
  }
}

// Format date thành yyyyMMddHHmmss
function formatVNPayDate(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}${hh}${mm}${ss}`;
}

// Sắp xếp các tham số và tính chữ ký bảo mật vnp_SecureHash
function signParams(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const signData = sortedKeys
    .map((key) => {
      const value = params[key];
      if (value === null || value === undefined || value === '') return null;
      return `${encodeURIComponent(key)}=${encodeURIComponent(value.toString()).replace(/%20/g, '+')}`;
    })
    .filter(Boolean)
    .join('&');

  const hmac = crypto.createHmac('sha512', secret);
  return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
}

// Hàm khôi phục tồn kho sản phẩm khi thanh toán thất bại
async function restoreStock(order, session) {
  if (order.stockRestored) return;
  for (const item of order.items) {
    const query = { _id: item.productId, 'variants._id': item.variantId };
    const update = { $inc: { 'variants.$.stock': item.quantity } };
    if (session) {
      await Product.updateOne(query, update).session(session);
    } else {
      await Product.updateOne(query, update);
    }
  }
  order.stockRestored = true;
}

// POST /api/payments/vnpay/create
export const createVnpayPayment = asyncHandler(async (req, res) => {
  const shippingAddress = normalizeAddress(req.body.shippingAddress);
  const { note, voucherCode } = req.body;
  const userId = req.user._id;

  const executeCreateOrder = async (session) => {
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

    const orderCode = buildOrderCode();
    const [order] = await Order.create([{
      orderCode,
      userId,
      items: orderItems,
      shippingAddress,
      note: note?.trim() || '',
      pricing,
      voucher: voucher ? { code: voucher.code, type: voucher.type, value: voucher.value } : null,
      payment: { method: 'VNPAY', status: 'UNPAID' },
      status: 'PENDING',
      statusHistory: [{ status: 'PENDING', note: 'Khởi tạo đơn hàng qua VNPay.', changedBy: userId }],
    }], session ? { session } : undefined);

    await withSession(Cart.deleteOne({ userId }), session);

    // Chuẩn bị tham số gửi sang VNPay
    const tmnCode = process.env.VNP_TMNCODE || '2QX1X1TW'; // Mặc định sandbox test key
    const hashSecret = process.env.VNP_HASHSECRET || 'LHHBYSDAEOWWDJDPZXXYFMXBMRXOLNZO'; // Mặc định sandbox test key
    const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNP_RETURNURL || 'http://localhost:5000/api/payments/vnpay/return';

    const date = new Date();
    const createDate = formatVNPayDate(date);
    const amount = pricing.total;

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderCode,
      vnp_OrderInfo: `Thanh toan don hang ${orderCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: req.ip || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const secureHash = signParams(vnpParams, hashSecret);
    vnpParams.vnp_SecureHash = secureHash;

    const queryStr = Object.keys(vnpParams)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(vnpParams[key].toString()).replace(/%20/g, '+')}`)
      .join('&');

    const paymentUrl = `${vnpUrl}?${queryStr}`;
    return { order, paymentUrl };
  };

  let result;
  if (await transactionSupported()) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        result = await executeCreateOrder(session);
      });
    } finally {
      await session.endSession();
    }
  } else {
    result = await executeCreateOrder(null);
  }

  res.status(201).json({
    message: 'Khởi tạo thanh toán VNPay thành công.',
    data: {
      order: result.order,
      paymentUrl: result.paymentUrl,
    },
  });
});

// GET /api/payments/vnpay/return
export const vnpayReturn = asyncHandler(async (req, res) => {
  const vnpParams = { ...req.query };
  const secureHash = vnpParams.vnp_SecureHash;

  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  const hashSecret = process.env.VNP_HASHSECRET || 'LHHBYSDAEOWWDJDPZXXYFMXBMRXOLNZO';
  const calculatedHash = signParams(vnpParams, hashSecret);

  const clientRedirectUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const orderCode = vnpParams.vnp_TxnRef;

  if (secureHash !== calculatedHash) {
    return res.redirect(`${clientRedirectUrl}/orders/${orderCode}?payment=fail&reason=invalid_signature`);
  }

  const responseCode = vnpParams.vnp_ResponseCode;
  const order = await Order.findOne({ orderCode });
  if (!order) {
    return res.redirect(`${clientRedirectUrl}/orders?payment=fail&reason=order_not_found`);
  }

  if (order.payment.status === 'PAID') {
    return res.redirect(`${clientRedirectUrl}/orders/${orderCode}?payment=success`);
  }

  const executeUpdate = async (session) => {
    if (responseCode === '00') {
      order.payment.status = 'PAID';
      order.payment.paidAt = new Date();
      order.payment.transactionRef = vnpParams.vnp_TransactionNo || '';
      order.status = 'CONFIRMED';
      order.statusHistory.push({
        status: 'CONFIRMED',
        note: 'Thanh toán trực tuyến qua VNPay thành công.',
        changedBy: order.userId,
        changedAt: new Date(),
      });
    } else {
      order.payment.status = 'FAILED';
      order.status = 'CANCELLED';
      order.statusHistory.push({
        status: 'CANCELLED',
        note: `Thanh toán VNPay thất bại (Mã lỗi: ${responseCode}).`,
        changedBy: order.userId,
        changedAt: new Date(),
      });
      await restoreStock(order, session);
    }

    if (session) {
      await order.save({ session });
    } else {
      await order.save();
    }
  };

  if (await transactionSupported()) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await executeUpdate(session);
      });
    } finally {
      await session.endSession();
    }
  } else {
    await executeUpdate(null);
  }

  if (responseCode === '00') {
    res.redirect(`${clientRedirectUrl}/orders/${orderCode}?payment=success`);
  } else {
    res.redirect(`${clientRedirectUrl}/orders/${orderCode}?payment=fail&code=${responseCode}`);
  }
});
