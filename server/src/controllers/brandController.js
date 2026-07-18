import Brand from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const brandFields = ['name', 'logoUrl', 'logoPublicId', 'isActive'];

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

  const brand = await Brand.create({ name: name.trim(), logoUrl, logoPublicId, isActive });
  res.status(201).json({ message: 'Đã tạo hãng.', data: brand });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Không tìm thấy hãng.');

  for (const field of brandFields) {
    if (req.body[field] !== undefined) brand[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
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
