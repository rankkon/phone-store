import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ReturnRequest from '../models/ReturnRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateFreeText } from '../utils/inputValidation.js';
import { createNotificationsForRoles } from '../services/notificationService.js';

const orderSelect = 'orderCode status items pricing payment createdAt';

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

export const createReturnRequest = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  if (!isValidId(orderId)) throw new ApiError(400, 'Mã đơn hàng không hợp lệ.');

  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
  if (order.status !== 'COMPLETED') {
    throw new ApiError(400, 'Chỉ có thể yêu cầu hoàn trả đối với đơn hàng đã hoàn thành.');
  }

  const reason = validateFreeText(req.body.reason, 'Lý do hoàn trả', { required: true, minLength: 5, maxLength: 1000 });
  const existingRequest = await ReturnRequest.findOne({ orderId: order._id });
  if (existingRequest) {
    throw new ApiError(409, 'Đơn hàng này đã có yêu cầu hoàn trả.');
  }

  try {
    const request = await ReturnRequest.create({
      orderId: order._id,
      userId: req.user._id,
      reason,
      status: 'PENDING',
      statusHistory: [{
        status: 'PENDING',
        note: 'Khách hàng đã gửi yêu cầu hoàn trả.',
        changedBy: req.user._id,
        changedAt: new Date(),
      }],
    });
    await request.populate([
      { path: 'orderId', select: orderSelect },
      { path: 'statusHistory.changedBy', select: 'fullName email role' },
    ]);
    await createNotificationsForRoles(['ADMIN', 'STAFF'], {
      type: 'RETURN',
      title: 'Có yêu cầu hoàn trả mới',
      message: `Khách hàng đã gửi yêu cầu hoàn trả cho đơn ${order.orderCode}.`,
      link: '/admin/returns',
    });
    res.status(201).json({ message: 'Đã gửi yêu cầu hoàn trả. Chúng tôi sẽ phản hồi sớm nhất.', data: request });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'Đơn hàng này đã có yêu cầu hoàn trả.');
    throw error;
  }
});

export const getMyReturnRequests = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = { userId: req.user._id };
  if (req.query.status && ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const [total, requests] = await Promise.all([
    ReturnRequest.countDocuments(filter),
    ReturnRequest.find(filter)
      .populate('orderId', orderSelect)
      .populate('statusHistory.changedBy', 'fullName email role')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  res.json({ data: requests, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

export const getMyReturnRequestForOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  if (!isValidId(orderId)) throw new ApiError(400, 'Mã đơn hàng không hợp lệ.');

  const request = await ReturnRequest.findOne({ orderId, userId: req.user._id })
    .populate('orderId', orderSelect)
    .populate('statusHistory.changedBy', 'fullName email role');
  if (!request) throw new ApiError(404, 'Đơn hàng chưa có yêu cầu hoàn trả.');
  res.json({ data: request });
});
