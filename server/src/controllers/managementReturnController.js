import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ReturnRequest from '../models/ReturnRequest.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateFreeText } from '../utils/inputValidation.js';
import { createNotification } from '../services/notificationService.js';

const RETURN_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
const RETURN_STATUS_LABELS = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', COMPLETED: 'Đã hoàn tất' };
const STATUS_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
};
const orderSelect = 'orderCode status items pricing payment createdAt';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function populateRequest(request) {
  return request.populate([
    { path: 'orderId', select: orderSelect },
    { path: 'userId', select: 'fullName email phone' },
    { path: 'statusHistory.changedBy', select: 'fullName email role' },
  ]);
}

export const getReturnRequests = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};
  if (RETURN_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  if (req.query.search?.trim()) {
    const searchRegex = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
    const [orders, users] = await Promise.all([
      Order.find({ orderCode: searchRegex }).select('_id'),
      User.find({ $or: [{ fullName: searchRegex }, { email: searchRegex }, { phone: searchRegex }] }).select('_id'),
    ]);
    filter.$or = [
      { orderId: { $in: orders.map((order) => order._id) } },
      { userId: { $in: users.map((user) => user._id) } },
    ];
  }

  const [total, requests, pendingCount] = await Promise.all([
    ReturnRequest.countDocuments(filter),
    ReturnRequest.find(filter)
      .populate('orderId', orderSelect)
      .populate('userId', 'fullName email phone')
      .populate('statusHistory.changedBy', 'fullName email role')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    ReturnRequest.countDocuments({ status: 'PENDING' }),
  ]);

  res.json({
    data: requests,
    stats: { pendingCount },
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export const updateReturnRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Mã yêu cầu hoàn trả không hợp lệ.');
  if (!RETURN_STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái hoàn trả không hợp lệ.');

  const request = await ReturnRequest.findById(id);
  if (!request) throw new ApiError(404, 'Không tìm thấy yêu cầu hoàn trả.');
  if (!STATUS_TRANSITIONS[request.status].includes(status)) {
    throw new ApiError(400, `Không thể chuyển yêu cầu từ ${request.status} sang ${status}.`);
  }

  const noteRequired = status === 'REJECTED';
  const note = validateFreeText(req.body.note, status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú xử lý', {
    required: noteRequired,
    minLength: noteRequired ? 3 : 0,
    maxLength: 1000,
  });
  const defaultNotes = {
    APPROVED: 'Đã duyệt yêu cầu hoàn trả.',
    REJECTED: 'Đã từ chối yêu cầu hoàn trả.',
    COMPLETED: 'Đã hoàn tất xử lý hoàn trả.',
  };

  request.status = status;
  request.statusHistory.push({
    status,
    note: note || defaultNotes[status],
    changedBy: req.user._id,
    changedAt: new Date(),
  });
  await request.save();
  await populateRequest(request);
  await createNotification({
    userId: request.userId?._id || request.userId,
    type: 'RETURN',
    title: 'Yêu cầu hoàn trả được cập nhật',
    message: `Yêu cầu hoàn trả cho đơn ${request.orderId?.orderCode || ''} đã được cập nhật thành ${RETURN_STATUS_LABELS[status] || status}.`,
    link: request.orderId?.orderCode ? `/orders/${request.orderId.orderCode}` : '/returns',
  });
  res.json({ message: 'Đã cập nhật trạng thái yêu cầu hoàn trả.', data: request });
});
