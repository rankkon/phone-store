import Brand from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cleanText } from '../utils/inputValidation.js';

function validateLogoUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
    return url.toString();
  } catch {
    throw new ApiError(400, 'URL logo không hợp lệ.');
  }
}

function validateBrandName(value) {
  return cleanText(value, 'Tên hãng', { required: true, minLength: 2, maxLength: 80, pattern: /^[\p{L}\p{N} .'-]+$/u });
}

export const getPublicBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort('name');
  res.json({ data: brands });
});

export const getAdminBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find().sort('name');
  res.json({ data: brands });
});

export const createBrand = asyncHandler(async (req, res) => {
  const { name, logoUrl = '', logoPublicId = '', isActive = true } = req.body;
  if (!name?.trim()) throw new ApiError(400, 'Tên hãng là bắt buộc.');

  if (typeof isActive !== 'boolean') throw new ApiError(400, 'isActive phải là true hoặc false.');
  const brand = await Brand.create({ name: validateBrandName(name), logoUrl: validateLogoUrl(logoUrl), logoPublicId: String(logoPublicId || '').trim(), isActive });
  res.status(201).json({ message: 'Đã tạo hãng.', data: brand });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Không tìm thấy hãng.');

  if (req.body.name !== undefined) brand.name = validateBrandName(req.body.name);
  if (req.body.logoUrl !== undefined) brand.logoUrl = validateLogoUrl(req.body.logoUrl);
  if (req.body.logoPublicId !== undefined) brand.logoPublicId = String(req.body.logoPublicId || '').trim();
  if (req.body.isActive !== undefined) {
    if (typeof req.body.isActive !== 'boolean') throw new ApiError(400, 'isActive phải là true hoặc false.');
    brand.isActive = req.body.isActive;
  }
  await brand.save();
  res.json({ message: 'Đã cập nhật hãng.', data: brand });
});

export const updateBrandStatus = asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw new ApiError(400, 'isActive phải là true hoặc false.');
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Không tìm thấy hãng.');

  brand.isActive = req.body.isActive;
  await brand.save();
  res.json({ message: 'Đã cập nhật trạng thái hãng.', data: brand });
});
