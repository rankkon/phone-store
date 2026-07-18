import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) throw new ApiError(401, 'Bạn cần đăng nhập để tiếp tục.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Tài khoản không còn tồn tại.');
  if (user.status === 'BLOCKED') throw new ApiError(403, 'Tài khoản của bạn đã bị khóa.');

  req.user = user;
  next();
});

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.'));
    }
    return next();
  };
}
