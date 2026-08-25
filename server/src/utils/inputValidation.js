import { ApiError } from './ApiError.js';

const personNamePattern = /^[\p{L}]+(?:[\p{L} .'-]*[\p{L}])?$/u;
const safeTextPattern = /^[\p{L}\p{N}\s.,:/()&+%'"-]*$/u;
const freeTextPattern = /^[\s\S]*$/;

export function cleanText(value, label, { required = false, minLength = 0, maxLength = 255, pattern = safeTextPattern } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${label} là bắt buộc.`);
    return '';
  }
  if (typeof value !== 'string') throw new ApiError(400, `${label} phải là chuỗi ký tự.`);

  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) {
    if (required) throw new ApiError(400, `${label} là bắt buộc.`);
    return '';
  }
  if (text.length < minLength || text.length > maxLength || !pattern.test(text)) {
    throw new ApiError(400, `${label} không hợp lệ.`);
  }
  return text;
}

export function validatePersonName(value, label = 'Họ tên', { required = true } = {}) {
  return cleanText(value, label, { required, minLength: required ? 2 : 0, maxLength: 100, pattern: personNamePattern });
}

export function validatePhone(value, label = 'Số điện thoại', { required = false } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new ApiError(400, `${label} là bắt buộc.`);
    return '';
  }
  const phone = String(value).trim();
  if (!/^\d{9,15}$/.test(phone)) {
    throw new ApiError(400, `${label} chỉ gồm 9–15 chữ số.`);
  }
  return phone;
}

export function validateEmail(value, label = 'Email', { required = true } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new ApiError(400, `${label} là bắt buộc.`);
    return '';
  }
  const email = String(value).trim().toLowerCase();
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError(400, `${label} không hợp lệ.`);
  }
  return email;
}

export function validatePassword(value, confirmation) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new ApiError(400, 'Mật khẩu phải có từ 8 đến 128 ký tự.');
  }
  if (confirmation !== undefined && value !== confirmation) {
    throw new ApiError(400, 'Xác nhận mật khẩu chưa khớp.');
  }
  return value;
}

export function validateAddress(value, { required = true } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Địa chỉ giao hàng không hợp lệ.');
  }
  const hasAnyValue = ['recipientName', 'phone', 'province', 'district', 'ward', 'detail']
    .some((field) => String(value[field] || '').trim() !== '');
  const requireAllFields = required || hasAnyValue;
  return {
    recipientName: validatePersonName(value.recipientName, 'Họ tên người nhận', { required: requireAllFields }),
    phone: validatePhone(value.phone, 'Số điện thoại người nhận', { required: requireAllFields }),
    province: cleanText(value.province, 'Tỉnh / thành phố', { required: requireAllFields, minLength: 2, maxLength: 100 }),
    district: cleanText(value.district, 'Quận / huyện', { required: requireAllFields, minLength: 2, maxLength: 100 }),
    ward: cleanText(value.ward, 'Phường / xã', { required: requireAllFields, minLength: 2, maxLength: 100 }),
    detail: cleanText(value.detail, 'Địa chỉ chi tiết', { required: requireAllFields, minLength: 3, maxLength: 200 }),
  };
}

export function validateNote(value, label = 'Ghi chú', maxLength = 500) {
  return cleanText(value, label, { maxLength, pattern: freeTextPattern });
}

export function validateFreeText(value, label, { required = false, minLength = 0, maxLength = 2000 } = {}) {
  return cleanText(value, label, { required, minLength, maxLength, pattern: freeTextPattern });
}

export function validateCode(value, label, { minLength = 3, maxLength = 30, pattern = /^[A-Z0-9_-]+$/ } = {}) {
  const code = String(value || '').trim().toUpperCase();
  if (code.length < minLength || code.length > maxLength || !pattern.test(code)) {
    throw new ApiError(400, `${label} không hợp lệ.`);
  }
  return code;
}
