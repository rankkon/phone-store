import crypto from 'crypto';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Voucher from '../models/Voucher.js';
import { calculatePricing, getCartDetails, getValidVoucher } from '../services/pricingService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateAddress, validateNote } from '../utils/inputValidation.js';
import { createNotification } from '../services/notificationService.js';

function withSession(query, session) {
  return session ? query.session(session) : query;
}

function buildOrderCode() {
  return `PS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function buildVnpayRequestRef() {
  return `VNP${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

async function transactionSupported() {
  try {
    const serverInfo = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(serverInfo.setName || serverInfo.msg === 'isdbgrid');
  } catch {
    return false;
  }
}

function getVnpayConfig() {
  const config = {
    tmnCode: process.env.VNP_TMNCODE,
    hashSecret: process.env.VNP_HASHSECRET,
    vnpUrl: process.env.VNP_URL,
    returnUrl: process.env.VNP_RETURNURL,
  };

  if (Object.values(config).some((value) => !value)) {
    throw new ApiError(503, 'VNPay chưa được cấu hình đầy đủ trên server.');
  }
  if (config.tmnCode === '2QX1X1TW') {
    throw new ApiError(503, 'VNP_TMNCODE đang dùng mã mẫu cũ và không còn hợp lệ. Hãy đăng ký Sandbox VNPay rồi cập nhật thông tin kết nối được cấp.');
  }

  return config;
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
function serializeParams(params) {
  return Object.keys(params).sort()
    .map((key) => {
      const value = params[key];
      if (value === null || value === undefined || value === '') return null;
      return `${encodeURIComponent(key)}=${encodeURIComponent(value.toString()).replace(/%20/g, '+')}`;
    })
    .filter(Boolean)
    .join('&');
}

function signParams(params, secret) {
  const signData = serializeParams(params);
  const hmac = crypto.createHmac('sha512', secret);
  return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
}

function buildVnpayPaymentUrl(order, vnpayConfig, ipAddress) {
  const requestRef = order.payment.requestRefs.at(-1);
  if (!requestRef) throw new ApiError(500, 'Không thể tạo mã tham chiếu thanh toán VNPay.');

  const vnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: requestRef,
    vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`,
    vnp_OrderType: 'other',
    vnp_Amount: order.pricing.total * 100,
    vnp_ReturnUrl: vnpayConfig.returnUrl,
    vnp_IpAddr: ipAddress || '127.0.0.1',
    vnp_CreateDate: formatVNPayDate(new Date()),
  };

  return `${vnpayConfig.vnpUrl}?${serializeParams({
    ...vnpParams,
    vnp_SecureHash: signParams(vnpParams, vnpayConfig.hashSecret),
  })}`;
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
  const vnpayConfig = getVnpayConfig();
  const shippingAddress = validateAddress(req.body.shippingAddress);
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
      unitCost: item.variant.costPrice,
      unitPrice: item.variant.salePrice,
      quantity: item.quantity,
      lineTotal: item.variant.salePrice * item.quantity,
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
      note: validateNote(note),
      pricing,
      voucher: voucher ? { code: voucher.code, type: voucher.type, value: voucher.value } : null,
      payment: { method: 'VNPAY', status: 'UNPAID', requestRefs: [buildVnpayRequestRef()] },
      status: 'PENDING',
      statusHistory: [{ status: 'PENDING', note: 'Khởi tạo đơn hàng qua VNPay.', changedBy: userId }],
    }], session ? { session } : undefined);

    await withSession(Cart.deleteOne({ userId }), session);

    return { order, paymentUrl: buildVnpayPaymentUrl(order, vnpayConfig, req.ip) };
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

  await createNotification({
    userId,
    type: 'PAYMENT',
    title: 'Đơn hàng đang chờ thanh toán',
    message: `Đơn ${result.order.orderCode} đã được tạo. Vui lòng hoàn tất thanh toán VNPay.`,
    link: `/orders/${result.order.orderCode}`,
  });

  res.status(201).json({
    message: 'Khởi tạo thanh toán VNPay thành công.',
    data: {
      order: result.order,
      paymentUrl: result.paymentUrl,
    },
  });
});

// POST /api/payments/vnpay/orders/:orderCode/retry
export const retryVnpayPayment = asyncHandler(async (req, res) => {
  const vnpayConfig = getVnpayConfig();
  const order = await Order.findOne({ userId: req.user._id, orderCode: req.params.orderCode });
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
  if (order.payment.method !== 'VNPAY') throw new ApiError(400, 'Đơn hàng này không sử dụng VNPay.');
  if (!['UNPAID', 'PENDING'].includes(order.payment.status) || order.status !== 'PENDING') {
    throw new ApiError(400, 'Đơn hàng này không còn có thể tiếp tục thanh toán VNPay.');
  }

  order.payment.requestRefs.push(buildVnpayRequestRef());
  await order.save();

  res.json({
    message: 'Đã tạo lại liên kết thanh toán VNPay.',
    data: { order, paymentUrl: buildVnpayPaymentUrl(order, vnpayConfig, req.ip) },
  });
});

// GET /api/payments/vnpay/return
export const vnpayReturn = asyncHandler(async (req, res) => {
  const vnpayConfig = getVnpayConfig();
  const vnpParams = { ...req.query };
  const secureHash = vnpParams.vnp_SecureHash;

  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  const calculatedHash = signParams(vnpParams, vnpayConfig.hashSecret);

  const clientRedirectUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const requestRef = String(vnpParams.vnp_TxnRef || '');

  if (secureHash !== calculatedHash) {
    return res.redirect(`${clientRedirectUrl}/orders?payment=fail&reason=invalid_signature`);
  }

  const responseCode = vnpParams.vnp_ResponseCode;
  const order = await Order.findOne({
    $or: [
      { 'payment.requestRefs': requestRef },
      { orderCode: requestRef }, // Hỗ trợ các đơn VNPay được tạo trước khi có requestRefs.
    ],
  });
  if (!order) {
    return res.redirect(`${clientRedirectUrl}/orders?payment=fail&reason=order_not_found`);
  }

  const orderUrl = `${clientRedirectUrl}/orders/${encodeURIComponent(order.orderCode)}`;
  const isValidResponse = order.payment.method === 'VNPAY'
    && vnpParams.vnp_TmnCode === vnpayConfig.tmnCode
    && Number(vnpParams.vnp_Amount) === order.pricing.total * 100;
  if (!isValidResponse) {
    return res.redirect(`${orderUrl}?payment=fail&reason=invalid_response`);
  }

  if (order.payment.status === 'PAID') {
    return res.redirect(`${orderUrl}?payment=success`);
  }

  if (order.status === 'CANCELLED' || order.payment.status === 'FAILED') {
    return res.redirect(`${orderUrl}?payment=fail&reason=already_processed`);
  }

  const isSuccessfulPayment = responseCode === '00' && vnpParams.vnp_TransactionStatus === '00';

  const executeUpdate = async (session) => {
    if (isSuccessfulPayment) {
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

  await createNotification({
    userId: order.userId,
    type: 'PAYMENT',
    title: isSuccessfulPayment ? 'Thanh toán VNPay thành công' : 'Thanh toán VNPay chưa thành công',
    message: isSuccessfulPayment
      ? `Đơn ${order.orderCode} đã được xác nhận thanh toán.`
      : `Thanh toán cho đơn ${order.orderCode} không thành công. Bạn có thể kiểm tra lại đơn hàng.`,
    link: `/orders/${order.orderCode}`,
  });

  if (isSuccessfulPayment) {
    res.redirect(`${orderUrl}?payment=success`);
  } else {
    res.redirect(`${orderUrl}?payment=fail&code=${responseCode}`);
  }
});
