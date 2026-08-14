import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'COMPLETED', 'CANCEL_REQUESTED', 'CANCELLED'];
const STATUS_TRANSITIONS = {
  PENDING: ALL_STATUSES,
  CONFIRMED: ALL_STATUSES,
  PREPARING: ALL_STATUSES,
  SHIPPING: ALL_STATUSES,
  CANCEL_REQUESTED: ALL_STATUSES,
  COMPLETED: ALL_STATUSES,
  CANCELLED: ALL_STATUSES,
};

// Kiểm tra xem DB có hỗ trợ transaction không
async function transactionSupported() {
  try {
    const serverInfo = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(serverInfo.setName || serverInfo.msg === 'isdbgrid');
  } catch {
    return false;
  }
}

// Hàm khôi phục tồn kho sản phẩm khi hủy đơn
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

// Hàm trừ tồn kho khi khôi phục từ trạng thái hủy đơn
async function deductStock(order, session) {
  if (!order.stockRestored) return;

  // 1. Kiểm tra tồn kho cho tất cả sản phẩm
  for (const item of order.items) {
    const product = await Product.findOne({ _id: item.productId });
    if (!product) {
      throw new ApiError(400, `Sản phẩm ${item.productName} không còn tồn tại.`);
    }
    const variant = product.variants.find((v) => v._id.toString() === item.variantId.toString());
    if (!variant || variant.stock < item.quantity) {
      throw new ApiError(400, `Sản phẩm ${item.productName} (${item.color}) không đủ tồn kho (Cần: ${item.quantity}, hiện có: ${variant ? variant.stock : 0}).`);
    }
  }

  // 2. Trừ kho
  for (const item of order.items) {
    const query = { _id: item.productId, 'variants._id': item.variantId };
    const update = { $inc: { 'variants.$.stock': -item.quantity } };
    if (session) {
      await Product.updateOne(query, update).session(session);
    } else {
      await Product.updateOne(query, update);
    }
  }
  order.stockRestored = false;
}

// GET /api/management/orders
export const getOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.paymentMethod) {
    filter['payment.method'] = req.query.paymentMethod;
  }

  if (req.query.paymentStatus) {
    filter['payment.status'] = req.query.paymentStatus;
  }

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(`${req.query.startDate}T00:00:00.000+07:00`);
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(`${req.query.endDate}T23:59:59.999+07:00`);
    }
  }

  if (req.query.search?.trim()) {
    const searchRegex = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    
    // Tìm người dùng theo tên hoặc email
    const matchingUsers = await User.find({
      $or: [
        { fullName: searchRegex },
        { email: searchRegex }
      ]
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);

    filter.$or = [
      { orderCode: searchRegex },
      { 'shippingAddress.recipientName': searchRegex },
      { 'shippingAddress.phone': searchRegex },
      { userId: { $in: userIds } }
    ];
  }

  const [total, orders, pendingCount, shippingCount, cancelRequestedCount] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate('userId', 'fullName email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments({ status: 'PENDING' }),
    Order.countDocuments({ status: 'SHIPPING' }),
    Order.countDocuments({ status: 'CANCEL_REQUESTED' }),
  ]);

  res.json({
    data: orders,
    stats: {
      pendingCount,
      shippingCount,
      cancelRequestedCount,
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// GET /api/management/orders/export
export const exportOrdersCsv = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.paymentMethod) {
    filter['payment.method'] = req.query.paymentMethod;
  }

  if (req.query.paymentStatus) {
    filter['payment.status'] = req.query.paymentStatus;
  }

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(`${req.query.startDate}T00:00:00.000+07:00`);
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(`${req.query.endDate}T23:59:59.999+07:00`);
    }
  }

  if (req.query.search?.trim()) {
    const searchRegex = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const matchingUsers = await User.find({
      $or: [
        { fullName: searchRegex },
        { email: searchRegex }
      ]
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);

    filter.$or = [
      { orderCode: searchRegex },
      { 'shippingAddress.recipientName': searchRegex },
      { 'shippingAddress.phone': searchRegex },
      { userId: { $in: userIds } }
    ];
  }

  const orders = await Order.find(filter)
    .populate('userId', 'fullName email')
    .sort('-createdAt');

  // Build CSV with BOM
  let csv = '\uFEFF';
  csv += 'Mã đơn,Khách hàng,Email,Số điện thoại,Thời gian đặt,Danh sách sản phẩm,Phương thức thanh toán,Trạng thái thanh toán,Trạng thái đơn,Tổng tiền (VND),Ghi chú\n';

  for (const order of orders) {
    const itemsStr = order.items.map(item => `${item.productName} (${item.color}) x${item.quantity}`).join(' | ');
    const row = [
      order.orderCode,
      `"${order.shippingAddress.recipientName.replace(/"/g, '""')}"`,
      `"${(order.userId?.email || '').replace(/"/g, '""')}"`,
      `"${order.shippingAddress.phone}"`,
      new Date(order.createdAt).toLocaleString('vi-VN'),
      `"${itemsStr.replace(/"/g, '""')}"`,
      order.payment.method,
      order.payment.status === 'PAID' ? 'Đã thanh toán' : order.payment.status === 'PENDING' ? 'Chờ thanh toán' : 'Chưa thanh toán',
      order.status,
      order.pricing.total,
      `"${(order.note || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=orders_list.csv');
  res.status(200).send(csv);
});

// GET /api/management/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate([
    { path: 'userId', select: 'fullName email' },
    { path: 'statusHistory.changedBy', select: 'fullName email role' }
  ]);
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
  res.json({ data: order });
});

// PATCH /api/management/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!status || !Object.hasOwn(STATUS_TRANSITIONS, status)) {
    throw new ApiError(400, 'Trạng thái cập nhật không hợp lệ.');
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');

  if (order.status === status) {
    throw new ApiError(400, `Đơn hàng đã ở trạng thái ${status} rồi.`);
  }

  const currentStatus = order.status;
  if (!STATUS_TRANSITIONS[currentStatus]?.includes(status)) {
    throw new ApiError(400, `Không thể chuyển trạng thái từ ${currentStatus} sang ${status}.`);
  }

  const executeUpdate = async (session) => {
    order.status = status;
    order.statusHistory.push({
      status,
      note: note?.trim() || 'Cập nhật trạng thái đơn hàng.',
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    if (status === 'COMPLETED' && order.payment.method === 'COD') {
      order.payment.status = 'PAID';
      order.payment.paidAt = new Date();
    }

    // Hoàn tác trạng thái thanh toán COD khi chuyển ra khỏi trạng thái COMPLETED
    if (currentStatus === 'COMPLETED' && status !== 'COMPLETED' && order.payment.method === 'COD') {
      order.payment.status = 'UNPAID';
      order.payment.paidAt = null;
    }

    if (status === 'CANCELLED') {
      await restoreStock(order, session);
    } else if (currentStatus === 'CANCELLED' && status !== 'CANCELLED') {
      await deductStock(order, session);
    }

    if (session) {
      await order.save({ session });
    } else {
      await order.save();
    }
  };

  const isStockModifying = status === 'CANCELLED' || (currentStatus === 'CANCELLED' && status !== 'CANCELLED');
  if (isStockModifying && (await transactionSupported())) {
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

  await order.populate([
    { path: 'userId', select: 'fullName email' },
    { path: 'statusHistory.changedBy', select: 'fullName email role' }
  ]);
  res.json({ message: 'Cập nhật trạng thái thành công.', data: order });
});

// POST /api/management/orders/:id/cancel/approve
export const approveCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');

  if (order.status !== 'CANCEL_REQUESTED') {
    throw new ApiError(400, 'Đơn hàng không có yêu cầu hủy nào cần duyệt.');
  }

  const note = req.body.note?.trim() || 'Duyệt yêu cầu hủy đơn.';

  const executeApprove = async (session) => {
    order.status = 'CANCELLED';
    order.statusHistory.push({
      status: 'CANCELLED',
      note,
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    await restoreStock(order, session);

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
        await executeApprove(session);
      });
    } finally {
      await session.endSession();
    }
  } else {
    await executeApprove(null);
  }

  await order.populate([
    { path: 'userId', select: 'fullName email' },
    { path: 'statusHistory.changedBy', select: 'fullName email role' }
  ]);
  res.json({ message: 'Đã duyệt yêu cầu hủy đơn hàng.', data: order });
});

// POST /api/management/orders/:id/cancel/reject
export const rejectCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');

  if (order.status !== 'CANCEL_REQUESTED') {
    throw new ApiError(400, 'Đơn hàng không có yêu cầu hủy nào cần từ chối.');
  }

  // Tìm trạng thái hợp lệ trước đó
  const lastState = order.statusHistory
    .slice()
    .reverse()
    .find((h) => h.status !== 'CANCEL_REQUESTED' && h.status !== 'CANCELLED');
  const targetStatus = lastState ? lastState.status : 'PENDING';

  const note = req.body.note?.trim() || 'Từ chối yêu cầu hủy đơn.';

  order.status = targetStatus;
  order.statusHistory.push({
    status: targetStatus,
    note: `Từ chối yêu cầu hủy. Quay lại trạng thái: ${note}`,
    changedBy: req.user._id,
    changedAt: new Date(),
  });

  await order.save();
  await order.populate([
    { path: 'userId', select: 'fullName email' },
    { path: 'statusHistory.changedBy', select: 'fullName email role' }
  ]);
  res.json({ message: 'Đã từ chối yêu cầu hủy đơn hàng.', data: order });
});

// PATCH /api/management/orders/:id/payment-status
export const updateOrderPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!['PAID', 'PENDING', 'UNPAID', 'FAILED'].includes(paymentStatus)) {
    throw new ApiError(400, 'Trạng thái thanh toán không hợp lệ.');
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');

  if (order.payment.status === paymentStatus) {
    throw new ApiError(400, `Đơn hàng đã ở trạng thái thanh toán ${paymentStatus} rồi.`);
  }

  const oldStatus = order.payment.status;
  order.payment.status = paymentStatus;
  if (paymentStatus === 'PAID') {
    order.payment.paidAt = new Date();
  } else {
    order.payment.paidAt = null;
  }

  order.statusHistory.push({
    status: order.status,
    note: `[Cập nhật Thanh toán]: ${oldStatus} -> ${paymentStatus}`,
    changedBy: req.user._id,
    changedAt: new Date(),
  });

  await order.save();
  await order.populate([
    { path: 'userId', select: 'fullName email' },
    { path: 'statusHistory.changedBy', select: 'fullName email role' }
  ]);
  res.json({ message: 'Cập nhật trạng thái thanh toán thành công.', data: order });
});

// POST /api/management/orders/offline
export const createOfflineOrder = asyncHandler(async (req, res) => {
  const { items, customerName, email, phone, paymentMethod, deliveryMode = 'STORE_PICKUP', shippingAddress, userId } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Danh sách sản phẩm mua không được trống.');
  }
  if (!['CASH', 'BANK_TRANSFER', 'CARD', 'COD'].includes(paymentMethod)) {
    throw new ApiError(400, 'Phương thức thanh toán trực tiếp không hợp lệ.');
  }

  const orderItems = [];
  let subtotal = 0;

  // 1. Verify variant stock and build items data
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');

    const variant = product.variants.find(v => v._id.toString() === item.variantId);
    if (!variant) throw new ApiError(404, 'Không tìm thấy phân loại sản phẩm.');

    if (variant.stock < item.quantity) {
      throw new ApiError(400, `Sản phẩm ${product.name} (${variant.color}) không đủ tồn kho (còn ${variant.stock}).`);
    }

    // Subtract stock
    variant.stock -= item.quantity;
    await product.save();

    orderItems.push({
      productId: product._id,
      variantId: variant._id,
      productName: product.name,
      modelCode: product.modelCode,
      sku: variant.sku,
      ram: variant.ram,
      storage: variant.storage,
      color: variant.color,
      imageUrl: product.images[0]?.url || '',
      unitCost: variant.costPrice,
      unitPrice: variant.salePrice,
      quantity: item.quantity,
      lineTotal: variant.salePrice * item.quantity
    });
    subtotal += variant.salePrice * item.quantity;
  }

  // 2. Link or create profile based on email, fallback to default walk-in system account if anonymous
  let orderUserId = null;
  const cleanEmail = email?.trim()?.toLowerCase();
  const cleanPhone = phone?.trim();
  const cleanCustomerName = customerName?.trim();

  if (userId) {
    const matchedUser = await User.findById(userId);
    if (matchedUser) {
      if (cleanCustomerName) matchedUser.fullName = cleanCustomerName;
      if (cleanPhone) matchedUser.phone = cleanPhone;
      await matchedUser.save();
      orderUserId = matchedUser._id;
    }
  }

  if (!orderUserId && cleanEmail) {
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      throw new ApiError(400, 'Vui lòng nhập email hợp lệ.');
    }

    let matchedUser = await User.findOne({ email: cleanEmail });

    if (matchedUser) {
      if (cleanCustomerName) matchedUser.fullName = cleanCustomerName;
      if (cleanPhone) matchedUser.phone = cleanPhone;
      await matchedUser.save();
      orderUserId = matchedUser._id;
    } else {
      // Create new customer profile with this email
      const passwordHash = await User.hashPassword(Math.random().toString(36));
      const newUser = await User.create({
        fullName: cleanCustomerName || 'Khách mua lẻ',
        email: cleanEmail,
        phone: cleanPhone || '',
        passwordHash,
        role: 'CUSTOMER',
        isEmailVerified: false
      });
      orderUserId = newUser._id;
    }
  }

  if (!orderUserId && cleanPhone) {
    // Create new offline customer profile with a virtual email
    const slugify = (text) => text.toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

    const baseEmail = `${slugify(cleanCustomerName || 'khach')}.${cleanPhone}@phonestore.offline`;
    let uniqueEmail = baseEmail;

    let emailCollision = await User.findOne({ email: uniqueEmail });
    while (emailCollision) {
      const rand = Math.random().toString(36).substring(2, 5);
      uniqueEmail = `${slugify(cleanCustomerName || 'khach')}.${cleanPhone}.${rand}@phonestore.offline`;
      emailCollision = await User.findOne({ email: uniqueEmail });
    }

    const passwordHash = await User.hashPassword(Math.random().toString(36));
    const newUser = await User.create({
      fullName: cleanCustomerName || 'Khách mua lẻ',
      email: uniqueEmail,
      phone: cleanPhone,
      passwordHash,
      role: 'CUSTOMER',
      isEmailVerified: false
    });
    orderUserId = newUser._id;
  }

  if (!orderUserId) {
    // Lookup or create the default system guest account for anonymous purchases
    let walkinUser = await User.findOne({ email: 'walkin@phonestore.com' });
    if (!walkinUser) {
      const passwordHash = await User.hashPassword(Math.random().toString(36));
      walkinUser = await User.create({
        fullName: 'Khách mua tại quầy',
        email: 'walkin@phonestore.com',
        phone: '',
        passwordHash,
        role: 'CUSTOMER',
        isEmailVerified: true
      });
    }
    orderUserId = walkinUser._id;
  }

  // 4. Create offline or telesale order
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderCode = `POS-${timestamp}-${randomStr}`;

  const isShipping = deliveryMode === 'SHIPPING';
  const freeShippingThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD || 15000000);
  const standardFee = Number(process.env.DEFAULT_SHIPPING_FEE || 30000);
  const shippingFee = (isShipping && subtotal < freeShippingThreshold) ? standardFee : 0;
  const isPaid = !isShipping || paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CARD';

  const orderData = {
    userId: orderUserId,
    orderCode,
    items: orderItems,
    shippingAddress: isShipping ? {
      recipientName: customerName?.trim() || 'Khách hàng',
      phone: phone?.trim() || '',
      province: shippingAddress?.province?.trim() || '',
      district: shippingAddress?.district?.trim() || '',
      ward: shippingAddress?.ward?.trim() || '',
      detail: shippingAddress?.detail?.trim() || ''
    } : {
      recipientName: customerName?.trim() || 'Khách vãng lai',
      phone: phone?.trim() || '',
      province: 'Tại quầy',
      district: 'Tại quầy',
      ward: 'Tại quầy',
      detail: 'Mua trực tiếp tại cửa hàng'
    },
    payment: {
      method: paymentMethod,
      status: isPaid ? 'PAID' : 'UNPAID',
      paidAt: isPaid ? new Date() : null
    },
    status: isShipping ? 'CONFIRMED' : 'COMPLETED',
    statusHistory: [
      {
        status: isShipping ? 'CONFIRMED' : 'COMPLETED',
        note: isShipping ? 'Đơn hàng Telesale đặt hộ qua Hotline.' : 'Đơn hàng mua trực tiếp tại quầy.',
        changedBy: req.user._id,
        changedAt: new Date()
      }
    ],
    pricing: {
      subtotal,
      discount: 0,
      shippingFee,
      total: subtotal + shippingFee
    }
  };

  const order = await Order.create(orderData);

  res.status(201).json({ message: 'Tạo đơn tại quầy thành công.', data: order });
});

// GET /api/management/orders/customer-lookup
export const lookupCustomer = asyncHandler(async (req, res) => {
  const { email, phone } = req.query;
  const query = {};
  if (email?.trim()) {
    query.email = email.trim().toLowerCase();
  } else if (phone?.trim()) {
    query.phone = phone.trim();
  } else {
    return res.json({ data: [] });
  }

  const users = await User.find(query).select('fullName email phone');
  res.json({ data: users });
});
