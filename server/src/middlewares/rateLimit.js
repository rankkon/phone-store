import { rateLimit } from 'express-rate-limit';

function createRateLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
  });
}

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',
});

export const emailCodeRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Bạn đã yêu cầu hoặc xác minh mã quá nhiều lần. Vui lòng thử lại sau 15 phút.',
});
