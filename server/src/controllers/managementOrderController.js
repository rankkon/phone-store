import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED', 'CANCELLED'],
  CANCEL_REQUESTED: [],
  COMPLETED: [],
  CANCELLED: [],
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

// GET /api/management/orders
export const getOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.search?.trim()) {
    const searchRegex = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [
      { orderCode: searchRegex },
      { 'shippingAddress.recipientName': searchRegex },
      { 'shippingAddress.phone': searchRegex }
    ];
  }

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate('userId', 'fullName email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    data: orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// GET /api/management/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('userId', 'fullName email');
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

    if (status === 'CANCELLED') {
      await restoreStock(order, session);
    }

    if (session) {
      await order.save({ session });
    } else {
      await order.save();
    }
  };

  if (status === 'CANCELLED' && (await transactionSupported())) {
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
  res.json({ message: 'Đã từ chối yêu cầu hủy đơn hàng.', data: order });
});
