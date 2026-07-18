import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const addressFields = ['recipientName', 'phone', 'province', 'district', 'ward', 'detail'];

function createToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

function sendAuthResponse(res, user, statusCode = 200) {
  res.status(statusCode).json({
    message: 'Thao tác thành công.',
    data: { token: createToken(user), user },
  });
}

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone = '' } = req.body;
  if (!fullName?.trim() || !email?.trim() || !password) {
    throw new ApiError(400, 'Vui lòng nhập họ tên, email và mật khẩu.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Email không hợp lệ.');
  if (password.length < 8) throw new ApiError(400, 'Mật khẩu phải có ít nhất 8 ký tự.');

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await User.exists({ email: normalizedEmail });
  if (exists) throw new ApiError(409, 'Email đã được sử dụng.');

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    passwordHash: await User.hashPassword(password),
    role: 'CUSTOMER',
  });

  sendAuthResponse(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Vui lòng nhập email và mật khẩu.');

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Email hoặc mật khẩu không chính xác.');
  }
  if (user.status === 'BLOCKED') throw new ApiError(403, 'Tài khoản của bạn đã bị khóa.');

  sendAuthResponse(res, user);
});

export const logout = (req, res) => {
  res.json({ message: 'Đăng xuất thành công.' });
};

export const getMe = (req, res) => {
  res.json({ data: req.user });
};

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, address } = req.body;
  const user = req.user;

  if (typeof fullName === 'string' && fullName.trim()) user.fullName = fullName.trim();
  if (typeof phone === 'string') user.phone = phone.trim();
  if (address && typeof address === 'object') {
    for (const field of addressFields) {
      if (typeof address[field] === 'string') user.address[field] = address[field].trim();
    }
  }

  await user.save();
  res.json({ message: 'Đã cập nhật hồ sơ.', data: user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
  if (newPassword.length < 8) throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 8 ký tự.');

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(currentPassword))) throw new ApiError(400, 'Mật khẩu hiện tại không chính xác.');

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  res.json({ message: 'Đã đổi mật khẩu thành công.' });
});
