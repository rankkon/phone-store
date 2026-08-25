import User from '../models/User.js';
import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  validateEmail,
  validateNote,
  validatePassword,
  validatePersonName,
  validatePhone,
} from '../utils/inputValidation.js';

// GET /api/admin/users
export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.isEmailVerified) {
    filter.isEmailVerified = req.query.isEmailVerified === 'true';
  }

  if (req.query.search?.trim()) {
    const searchRegex = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex }
    ];
  }

  // Pipeline aggregation
  const pipeline = [
    { $match: filter }
  ];

  // Lookup completed orders to sum pricing.total as ltv
  pipeline.push(
    {
      $lookup: {
        from: 'orders',
        let: { userId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$userId', '$$userId'] }, { $eq: ['$status', 'COMPLETED'] } ] } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } }
        ],
        as: 'completedOrders'
      }
    },
    {
      $addFields: {
        ltv: { $ifNull: [ { $arrayElemAt: ['$completedOrders.total', 0] }, 0 ] }
      }
    }
  );

  // Sorting
  const sortBy = req.query.sortBy || 'createdAt_desc';
  if (sortBy === 'createdAt_asc') {
    pipeline.push({ $sort: { createdAt: 1 } });
  } else if (sortBy === 'ltv_desc') {
    pipeline.push({ $sort: { ltv: -1, createdAt: -1 } });
  } else if (sortBy === 'ltv_asc') {
    pipeline.push({ $sort: { ltv: 1, createdAt: -1 } });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  // Pagination and projection
  pipeline.push(
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $project: {
        passwordHash: 0,
        refreshTokenHash: 0,
        refreshTokenExpiresAt: 0,
        __v: 0
      }
    }
  );

  const [total, users, totalMembers, customersCount, staffAdminCount, blockedCount] = await Promise.all([
    User.countDocuments(filter),
    User.aggregate(pipeline),
    User.countDocuments(),
    User.countDocuments({ role: 'CUSTOMER' }),
    User.countDocuments({ role: { $in: ['STAFF', 'ADMIN'] } }),
    User.countDocuments({ status: 'BLOCKED' })
  ]);

  res.json({
    data: users,
    stats: {
      totalMembers,
      customersCount,
      staffAdminCount,
      blockedCount
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
});

// POST /api/admin/users
export const createUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;

  if (!fullName?.trim() || !email?.trim() || !password?.trim() || !role?.trim()) {
    throw new ApiError(400, 'Vui lòng điền đầy đủ thông tin bắt buộc.');
  }

  if (!['STAFF', 'ADMIN'].includes(role)) {
    throw new ApiError(400, 'Vai trò không hợp lệ. Chỉ được phép tạo tài khoản STAFF hoặc ADMIN.');
  }

  const normalizedName = validatePersonName(fullName);
  const normalizedEmail = validateEmail(email);
  validatePassword(password);
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(400, 'Email này đã được sử dụng.');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    fullName: normalizedName,
    email: normalizedEmail,
    passwordHash,
    role,
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
  });

  res.status(201).json({
    message: 'Tạo tài khoản nội bộ thành công.',
    data: user,
  });
});

// GET /api/admin/users/:id/ltv
export const getUserLtv = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng.');

  const orders = await Order.find({ userId });
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
  const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
  const ltv = orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.pricing.total, 0);

  res.json({
    totalOrders,
    completedOrders,
    cancelledOrders,
    cancellationRate,
    ltv,
    user
  });
});

// GET /api/admin/users/export
export const exportUsersCsv = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.isEmailVerified) {
    filter.isEmailVerified = req.query.isEmailVerified === 'true';
  }

  if (req.query.search?.trim()) {
    const searchRegex = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex }
    ];
  }

  const users = await User.find(filter).sort('-createdAt');
  const userIds = users.map(u => u._id);

  const statsData = await Order.aggregate([
    { $match: { userId: { $in: userIds } } },
    {
      $group: {
        _id: '$userId',
        totalOrders: { $sum: 1 },
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
        ltv: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$pricing.total', 0] } }
      }
    }
  ]);
  const statsMap = new Map(statsData.map(item => [item._id.toString(), item]));

  // Build CSV with BOM for Vietnamese display in Excel
  let csv = '\uFEFF';
  csv += 'Họ tên,Email,Vai trò,Trạng thái,Lý do khóa,Xác minh Email,Tổng đơn đã đặt,Đơn thành công,Đơn bị hủy,Tổng chi tiêu (LTV),Ngày tạo\n';

  for (const user of users) {
    const stats = statsMap.get(user._id.toString()) || { totalOrders: 0, completedOrders: 0, cancelledOrders: 0, ltv: 0 };
    const row = [
      `"${user.fullName.replace(/"/g, '""')}"`,
      `"${(user.email || '').replace(/"/g, '""')}"`,
      user.role,
      user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa',
      `"${(user.blockReason || '').replace(/"/g, '""')}"`,
      user.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh',
      stats.totalOrders,
      stats.completedOrders,
      stats.cancelledOrders,
      stats.ltv,
      new Date(user.createdAt).toLocaleDateString('vi-VN')
    ];
    csv += row.join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=users_list.csv');
  res.status(200).send(csv);
});

// PATCH /api/admin/users/:id/status
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { status, blockReason } = req.body;
  if (!['ACTIVE', 'BLOCKED'].includes(status)) {
    throw new ApiError(400, 'Trạng thái không hợp lệ.');
  }

  if (req.user._id.toString() === req.params.id) {
    throw new ApiError(400, 'Bạn không thể tự khóa tài khoản chính mình.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng.');

  user.status = status;
  if (status === 'BLOCKED') {
    user.blockReason = validateNote(blockReason, 'Lý do khóa', 300) || 'Không có lý do cụ thể.';
  } else {
    user.blockReason = '';
  }
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

// PATCH /api/admin/users/:id
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, email, phone } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng.');

  if (typeof fullName === 'string') {
    user.fullName = validatePersonName(fullName);
  }

  if (typeof phone === 'string') {
    user.phone = validatePhone(phone);
  }

  if (typeof email === 'string' && email.trim()) {
    const cleanEmail = validateEmail(email);
    const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
    if (emailExists) {
      throw new ApiError(400, 'Email này đã được sử dụng bởi người dùng khác.');
    }
    user.email = cleanEmail;
  }

  await user.save();
  res.json({ message: 'Cập nhật thông tin khách hàng thành công.', data: user });
});
