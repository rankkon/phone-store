import Brand from '../models/Brand.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
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

function uploadBrandLogoBuffer(file, brandId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'phone-store/brands',
        public_id: `brand-${brandId}`,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [{ width: 400, height: 250, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(file.buffer);
  });
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

export const uploadBrandLogo = asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured) {
    throw new ApiError(503, 'Cloudinary chưa được cấu hình trên server.');
  }
  if (!req.file) {
    throw new ApiError(400, 'Vui lòng chọn một logo JPG, PNG hoặc WEBP (tối đa 2 MB).');
  }

  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, 'Không tìm thấy hãng.');

  const previousPublicId = brand.logoPublicId;
  const result = await uploadBrandLogoBuffer(req.file, brand._id);
  brand.logoUrl = result.secure_url;
  brand.logoPublicId = result.public_id;
  await brand.save();

  if (previousPublicId && previousPublicId !== result.public_id) {
    cloudinary.uploader.destroy(previousPublicId, { resource_type: 'image', invalidate: true })
      .catch((error) => console.error('Unable to remove previous brand logo:', error.message));
  }

  res.json({ message: 'Đã tải logo hãng lên.', data: brand });
});
