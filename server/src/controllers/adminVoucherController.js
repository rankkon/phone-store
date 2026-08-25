import Voucher from '../models/Voucher.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotificationsForRoles } from '../services/notificationService.js';

const editableFields = ['code', 'type', 'value', 'minOrderValue', 'maxDiscount', 'startAt', 'endAt', 'usageLimit', 'isActive'];

function asNumber(value, field, { integer = false, minimum = 0, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ApiError(400, `${field} là bắt buộc.`);
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || (integer && !Number.isInteger(number))) {
    throw new ApiError(400, `${field} không hợp lệ.`);
  }
  return number;
}

function asDate(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ApiError(400, `${field} là bắt buộc.`);
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${field} không hợp lệ.`);
  return date;
}

function normalizeVoucherInput(body, { creating = false } = {}) {
  const input = {};
  if (body.code !== undefined || creating) {
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      throw new ApiError(400, 'Mã voucher gồm 3–30 ký tự: chữ, số, dấu gạch ngang hoặc gạch dưới.');
    }
    input.code = code;
  }

  if (body.type !== undefined || creating) {
    if (!['PERCENT', 'FIXED'].includes(body.type)) {
      throw new ApiError(400, 'Loại voucher phải là PERCENT hoặc FIXED.');
    }
    input.type = body.type;
  }

  const value = asNumber(body.value, 'Giá trị giảm', { required: creating, minimum: 0.01 });
  if (value !== undefined) input.value = value;
  const minOrderValue = asNumber(body.minOrderValue, 'Giá trị đơn tối thiểu', { minimum: 0 });
  if (minOrderValue !== undefined) input.minOrderValue = minOrderValue;

  if (body.maxDiscount !== undefined) {
    input.maxDiscount = body.maxDiscount === '' || body.maxDiscount === null
      ? null
      : asNumber(body.maxDiscount, 'Mức giảm tối đa', { minimum: 0 });
  } else if (creating) {
    input.maxDiscount = null;
  }

  const startAt = asDate(body.startAt, 'Thời gian bắt đầu', { required: creating });
  if (startAt !== undefined) input.startAt = startAt;
  const endAt = asDate(body.endAt, 'Thời gian kết thúc', { required: creating });
  if (endAt !== undefined) input.endAt = endAt;
  const usageLimit = asNumber(body.usageLimit, 'Giới hạn lượt dùng', { required: creating, integer: true, minimum: 1 });
  if (usageLimit !== undefined) input.usageLimit = usageLimit;

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') throw new ApiError(400, 'isActive phải là true hoặc false.');
    input.isActive = body.isActive;
  } else if (creating) {
    input.isActive = true;
  }

  return input;
}

function validateVoucherRules(voucher) {
  if (voucher.type === 'PERCENT' && voucher.value > 100) {
    throw new ApiError(400, 'Voucher phần trăm không được vượt quá 100%.');
  }
  if (voucher.type === 'FIXED') voucher.maxDiscount = null;
  if (voucher.endAt <= voucher.startAt) {
    throw new ApiError(400, 'Thời gian kết thúc phải sau thời gian bắt đầu.');
  }
}

export const getAdminVouchers = asyncHandler(async (req, res) => {
  const vouchers = await Voucher.find().sort({ createdAt: -1, code: 1 });
  res.json({ data: vouchers });
});

export const createVoucher = asyncHandler(async (req, res) => {
  const voucher = new Voucher(normalizeVoucherInput(req.body, { creating: true }));
  validateVoucherRules(voucher);
  await voucher.save();
  if (voucher.isActive) {
    await createNotificationsForRoles(['CUSTOMER'], {
      type: 'VOUCHER',
      title: 'Có ưu đãi mới',
      message: `Voucher ${voucher.code} đã sẵn sàng. Hãy xem điều kiện áp dụng trước khi sử dụng.`,
      link: '/my-vouchers',
    });
  }
  res.status(201).json({ message: 'Đã tạo voucher.', data: voucher });
});

export const updateVoucher = asyncHandler(async (req, res) => {
  const voucher = await Voucher.findById(req.params.id);
  if (!voucher) throw new ApiError(404, 'Không tìm thấy voucher.');

  const input = normalizeVoucherInput(req.body);
  for (const field of editableFields) {
    if (input[field] !== undefined) voucher[field] = input[field];
  }
  validateVoucherRules(voucher);
  await voucher.save();
  res.json({ message: 'Đã cập nhật voucher.', data: voucher });
});

export const updateVoucherStatus = asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw new ApiError(400, 'isActive phải là true hoặc false.');
  const voucher = await Voucher.findById(req.params.id);
  if (!voucher) throw new ApiError(404, 'Không tìm thấy voucher.');

  voucher.isActive = req.body.isActive;
  await voucher.save();
  res.json({ message: 'Đã cập nhật trạng thái voucher.', data: voucher });
});

export const deleteVoucher = asyncHandler(async (req, res) => {
  const voucher = await Voucher.findByIdAndDelete(req.params.id);
  if (!voucher) throw new ApiError(404, 'Không tìm thấy voucher.');
  res.json({ message: 'Đã xóa voucher.' });
});
