import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/admin/users
export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.search?.trim()) {
    const searchRegex = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex }
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
  ]);

  res.json({
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
});

// PATCH /api/admin/users/:id/status
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'BLOCKED'].includes(status)) {
    throw new ApiError(400, 'Trạng thái không hợp lệ.');
  }

  if (req.user._id.toString() === req.params.id) {
    throw new ApiError(400, 'Bạn không thể tự khóa tài khoản chính mình.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng.');

  user.status = status;
  await user.save();

  res.json({ message: 'Cập nhật trạng thái người dùng thành công.', data: user });
});

// PATCH /api/admin/users/:id/role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['CUSTOMER', 'STAFF'].includes(role)) {
    throw new ApiError(400, 'Chỉ có thể chuyển vai trò giữa CUSTOMER và STAFF.');
  }

  if (req.user._id.toString() === req.params.id) {
    throw new ApiError(400, 'Bạn không thể tự thay đổi vai trò của chính mình.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng.');
  if (user.role === 'ADMIN') throw new ApiError(400, 'Không thể thay đổi vai trò của tài khoản Admin.');

  user.role = role;
  await user.save();

  res.json({ message: 'Cập nhật vai trò người dùng thành công.', data: user });
});
