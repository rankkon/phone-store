import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = { userId: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const [total, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
    Notification.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
  ]);
  res.json({ data: notifications, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), unreadCount } });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Mã thông báo không hợp lệ.');
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
  if (!notification) throw new ApiError(404, 'Không tìm thấy thông báo.');
  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }
  res.json({ message: 'Đã đánh dấu thông báo là đã đọc.', data: notification });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.', data: { modifiedCount: result.modifiedCount } });
});
