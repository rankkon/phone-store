import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import EmailVerificationCode from '../models/EmailVerificationCode.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const addressFields = ['recipientName', 'phone', 'province', 'district', 'ward', 'detail'];
const REFRESH_COOKIE = 'phone_store_refresh_token';
const EMAIL_CODE_LIFETIME_MS = 10 * 60 * 1000;
const EMAIL_CODE_COOLDOWN_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const demoEmails = new Set(['admin@gmail.com', 'staff@gmail.com', 'customer@gmail.com']);

const emailCodeContent = {
  EMAIL_VERIFICATION: { subject: 'Mã xác minh email Phone Store', action: 'xác minh email' },
  PASSWORD_CHANGE: { subject: 'Mã đổi mật khẩu Phone Store', action: 'đổi mật khẩu' },
  PASSWORD_RESET: { subject: 'Mã đặt lại mật khẩu Phone Store', action: 'đặt lại mật khẩu' },
};

function createAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tokenType: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
}

function getRefreshLifetimeMs() {
  const value = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return amount * multiplier;
}

function createRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), tokenType: 'refresh' }, getRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    jwtid: crypto.randomUUID(),
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getCookie(req, name) {
  const serializedCookies = req.headers.cookie || '';
  const cookie = serializedCookies.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: getRefreshLifetimeMs(),
  };
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
  });
}

function getMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

function ensureMailer() {
  const mailer = getMailer();
  if (!mailer) throw new ApiError(503, 'Chức năng gửi mã chưa được cấu hình dịch vụ email.');
  return mailer;
}

function ensureVerifiedEmail(user) {
  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Vui lòng xác minh email trong hồ sơ trước khi thực hiện thao tác này.');
  }
}

function validateEmail(email) {
  if (!email?.trim() || !/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Vui lòng nhập email hợp lệ.');
  return email.trim().toLowerCase();
}

function validatePassword(newPassword, confirmPassword) {
  if (!newPassword || !confirmPassword) throw new ApiError(400, 'Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.');
  if (newPassword !== confirmPassword) throw new ApiError(400, 'Xác nhận mật khẩu chưa khớp.');
  if (newPassword.length < 8) throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 8 ký tự.');
}

async function sendEmailCode(user, purpose) {
  if (demoEmails.has(user.email)) {
    throw new ApiError(403, 'Tài khoản demo không hỗ trợ gửi mã qua email. Hãy dùng tài khoản đăng ký bằng email của bạn để kiểm tra chức năng này.');
  }

  const mailer = ensureMailer();
  const now = new Date();
  const existing = await EmailVerificationCode.findOne({ userId: user._id, purpose });
  if (existing && existing.sentAt > new Date(now.getTime() - EMAIL_CODE_COOLDOWN_MS)) {
    throw new ApiError(429, 'Mã vừa được gửi. Vui lòng chờ 60 giây trước khi gửi lại.');
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const codeRecord = await EmailVerificationCode.findOneAndUpdate(
    { userId: user._id, purpose },
    {
      $set: {
        codeHash: await bcrypt.hash(code, 12),
        expiresAt: new Date(now.getTime() + EMAIL_CODE_LIFETIME_MS),
        sentAt: now,
        attempts: 0,
        usedAt: null,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const content = emailCodeContent[purpose];
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: content.subject,
      text: `Mã ${content.action} của bạn là: ${code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`,
      html: `<p>Mã ${content.action} của bạn là:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>`,
    });
  } catch {
    await EmailVerificationCode.deleteOne({ _id: codeRecord._id });
    throw new ApiError(502, 'Không thể gửi mã qua email. Vui lòng thử lại sau.');
  }
}

async function consumeEmailCode(user, purpose, code) {
  if (!/^\d{6}$/.test(String(code || ''))) throw new ApiError(400, 'Mã xác nhận phải gồm 6 chữ số.');

  const codeRecord = await EmailVerificationCode.findOne({ userId: user._id, purpose, usedAt: null }).select('+codeHash');
  if (!codeRecord || codeRecord.expiresAt <= new Date()) {
    if (codeRecord) await codeRecord.deleteOne();
    throw new ApiError(400, 'Mã xác nhận không hợp lệ hoặc đã hết hạn.');
  }
  if (codeRecord.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    await codeRecord.deleteOne();
    throw new ApiError(429, 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.');
  }

  if (!(await bcrypt.compare(String(code), codeRecord.codeHash))) {
    codeRecord.attempts += 1;
    if (codeRecord.attempts >= EMAIL_CODE_MAX_ATTEMPTS) await codeRecord.deleteOne();
    else await codeRecord.save();
    throw new ApiError(400, 'Mã xác nhận không chính xác.');
  }

  await codeRecord.deleteOne();
}

async function sendAuthResponse(res, user, statusCode = 200, message = 'Thao tác thành công.') {
  const refreshToken = createRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + getRefreshLifetimeMs());
  await user.save({ validateBeforeSave: false });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(statusCode).json({ message, data: { token: createAccessToken(user), user } });
}

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone = '' } = req.body;
  if (!fullName?.trim() || !email?.trim() || !password) {
    throw new ApiError(400, 'Vui lòng nhập họ tên, email và mật khẩu.');
  }
  const normalizedEmail = validateEmail(email);
  if (password.length < 8) throw new ApiError(400, 'Mật khẩu phải có ít nhất 8 ký tự.');
  
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.isEmailVerified) {
    throw new ApiError(409, 'Email đã được sử dụng.');
  }

  ensureMailer();

  let user = existingUser;
  const cleanPhone = phone?.trim();

  if (user) {
    user.fullName = fullName.trim();
    user.passwordHash = await User.hashPassword(password);
    if (cleanPhone) user.phone = cleanPhone;
    await user.save();
  } else {
    user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: cleanPhone || '',
      passwordHash: await User.hashPassword(password),
      role: 'CUSTOMER',
    });
  }

  if (user.phone) {
    await Order.updateMany(
      { 'shippingAddress.phone': user.phone, userId: null },
      { $set: { userId: user._id } }
    );
  }

  try {
    await sendEmailCode(user, 'EMAIL_VERIFICATION');
  } catch (error) {
    if (!existingUser) {
      await Promise.all([EmailVerificationCode.deleteMany({ userId: user._id }), user.deleteOne()]);
    }
    throw error;
  }
  await sendAuthResponse(res, user, 201, 'Đăng ký thành công. Mã xác minh 6 số đã được gửi đến email của bạn.');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Vui lòng nhập email và mật khẩu.');

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Email hoặc mật khẩu không chính xác.');
  if (user.status === 'BLOCKED') throw new ApiError(403, 'Tài khoản của bạn đã bị khóa.');

  await sendAuthResponse(res, user);
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = getCookie(req, REFRESH_COOKIE);
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, getRefreshSecret());
      if (payload.tokenType === 'refresh') {
        await User.updateOne(
          { _id: payload.sub, refreshTokenHash: hashToken(refreshToken) },
          { $set: { refreshTokenHash: '', refreshTokenExpiresAt: null } },
        );
      }
    } catch {
      // Always clear the browser cookie below, even when it is expired or invalid.
    }
  }
  clearRefreshCookie(res);
  res.json({ message: 'Đăng xuất thành công.' });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = getCookie(req, REFRESH_COOKIE);
  if (!token) throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  let payload;
  try {
    payload = jwt.verify(token, getRefreshSecret());
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (payload.tokenType !== 'refresh') throw new ApiError(401, 'Refresh token không hợp lệ.');

  const user = await User.findById(payload.sub).select('+refreshTokenHash +refreshTokenExpiresAt');
  if (!user || user.status === 'BLOCKED' || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)
    || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt <= new Date()) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.');
  }
  await sendAuthResponse(res, user);
});

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

export const sendEmailVerificationCode = asyncHandler(async (req, res) => {
  if (req.user.isEmailVerified) return res.json({ message: 'Email của bạn đã được xác minh.' });
  await sendEmailCode(req.user, 'EMAIL_VERIFICATION');
  res.json({ message: 'Mã xác minh 6 số đã được gửi đến email của bạn.' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  if (req.user.isEmailVerified) return res.json({ message: 'Email của bạn đã được xác minh.', data: req.user });
  await consumeEmailCode(req.user, 'EMAIL_VERIFICATION', req.body.code);
  req.user.isEmailVerified = true;
  req.user.emailVerifiedAt = new Date();
  await req.user.save();
  res.json({ message: 'Xác minh email thành công.', data: req.user });
});

export const sendPasswordChangeCode = asyncHandler(async (req, res) => {
  ensureVerifiedEmail(req.user);
  await sendEmailCode(req.user, 'PASSWORD_CHANGE');
  res.json({ message: 'Mã xác nhận đổi mật khẩu đã được gửi đến email của bạn.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { code, newPassword, confirmPassword } = req.body;
  validatePassword(newPassword, confirmPassword);
  const user = await User.findById(req.user._id).select('+passwordHash');
  ensureVerifiedEmail(user);
  await consumeEmailCode(user, 'PASSWORD_CHANGE', code);

  user.passwordHash = await User.hashPassword(newPassword);
  user.refreshTokenHash = '';
  user.refreshTokenExpiresAt = null;
  await user.save();
  clearRefreshCookie(res);
  res.json({ message: 'Đã đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = validateEmail(req.body.email);
  ensureMailer();
  const user = await User.findOne({ email });
  const genericMessage = 'Nếu email đã được xác minh và tồn tại, mã đặt lại mật khẩu đã được gửi.';
  if (!user || user.status === 'BLOCKED' || !user.isEmailVerified || demoEmails.has(user.email)) {
    return res.json({ message: genericMessage });
  }
  await sendEmailCode(user, 'PASSWORD_RESET');
  return res.json({ message: genericMessage });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const email = validateEmail(req.body.email);
  const { code, newPassword, confirmPassword } = req.body;
  validatePassword(newPassword, confirmPassword);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || user.status === 'BLOCKED' || !user.isEmailVerified || demoEmails.has(user.email)) {
    throw new ApiError(400, 'Mã xác nhận hoặc thông tin đặt lại mật khẩu không hợp lệ.');
  }
  await consumeEmailCode(user, 'PASSWORD_RESET', code);

  user.passwordHash = await User.hashPassword(newPassword);
  user.refreshTokenHash = '';
  user.refreshTokenExpiresAt = null;
  await user.save();
  clearRefreshCookie(res);
  res.json({ message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' });
});
