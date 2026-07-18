import Product from '../models/Product.js';
import Brand from '../models/Brand.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const specificationFields = ['chip', 'battery', 'screen', 'rearCamera', 'frontCamera', 'operatingSystem'];
const productFields = ['name', 'modelCode', 'brandId', 'description', 'isActive'];

function parseVariant(rawVariant) {
  const variant = {
    sku: rawVariant.sku?.trim().toUpperCase(),
    ram: rawVariant.ram?.trim(),
    storage: rawVariant.storage?.trim(),
    color: rawVariant.color?.trim(),
    colorHex: rawVariant.colorHex?.trim() || '',
    price: Number(rawVariant.price),
    compareAtPrice: rawVariant.compareAtPrice === '' || rawVariant.compareAtPrice === null || rawVariant.compareAtPrice === undefined
      ? null : Number(rawVariant.compareAtPrice),
    stock: Number(rawVariant.stock),
    isActive: rawVariant.isActive !== false,
  };

  if (!variant.sku || !variant.ram || !variant.storage || !variant.color) {
    throw new ApiError(400, 'Mỗi biến thể cần SKU, RAM, bộ nhớ trong và màu sắc.');
  }
  if (!Number.isFinite(variant.price) || variant.price < 0) throw new ApiError(400, 'Giá biến thể phải là số không âm.');
  if (variant.compareAtPrice !== null && (!Number.isFinite(variant.compareAtPrice) || variant.compareAtPrice < 0)) {
    throw new ApiError(400, 'Giá cũ phải là số không âm.');
  }
  if (!Number.isInteger(variant.stock) || variant.stock < 0) throw new ApiError(400, 'Tồn kho phải là số nguyên không âm.');
  return variant;
}

async function validateVariants(rawVariants, currentProductId) {
  if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
    throw new ApiError(400, 'Sản phẩm phải có ít nhất một biến thể.');
  }
  const variants = rawVariants.map(parseVariant);
  const skuSet = new Set();
  for (const variant of variants) {
    if (skuSet.has(variant.sku)) throw new ApiError(409, `SKU ${variant.sku} bị lặp trong sản phẩm.`);
    skuSet.add(variant.sku);
  }

  const duplicate = await Product.findOne({
    _id: currentProductId ? { $ne: currentProductId } : { $exists: true },
    'variants.sku': { $in: [...skuSet] },
  }).select('variants.sku');
  if (duplicate) throw new ApiError(409, 'Một hoặc nhiều SKU đã được dùng cho sản phẩm khác.');
  return variants;
}

async function requireBrand(brandId) {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new ApiError(400, 'Hãng được chọn không tồn tại.');
  return brand;
}

function applyProductFields(product, body) {
  for (const field of productFields) {
    if (body[field] !== undefined) {
      product[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  }
  if (body.specifications && typeof body.specifications === 'object') {
    for (const field of specificationFields) {
      if (typeof body.specifications[field] === 'string') product.specifications[field] = body.specifications[field].trim();
    }
  }
}

function uploadBuffer(file, productId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `phone-store/products/${productId}`, resource_type: 'image' },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(file.buffer);
  });
}

function parsePrice(value, label) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new ApiError(400, `${label} phải là số không âm.`);
  return parsed;
}

function getFilteredVariants(variants, query) {
  const minPrice = parsePrice(query.minPrice, 'Giá tối thiểu');
  const maxPrice = parsePrice(query.maxPrice, 'Giá tối đa');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ApiError(400, 'Giá tối thiểu không được lớn hơn giá tối đa.');
  }
  const onlyInStock = query.inStock === 'true';
  return variants.filter((variant) => (
    variant.isActive
    && (!query.ram || variant.ram === query.ram)
    && (!query.storage || variant.storage === query.storage)
    && (!query.color || variant.color === query.color)
    && (minPrice === undefined || variant.price >= minPrice)
    && (maxPrice === undefined || variant.price <= maxPrice)
    && (!onlyInStock || variant.stock > 0)
  ));
}

function publicProduct(product, brand) {
  return {
    ...product.toObject(),
    brandId: { _id: brand._id, name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl },
    variants: product.variants.filter((variant) => variant.isActive),
  };
}

export const getPublicProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const brands = await Brand.find({ isActive: true }).select('name slug logoUrl').lean();
  const selectedBrand = req.query.brand
    ? brands.find((brand) => brand.slug === req.query.brand || brand._id.toString() === req.query.brand)
    : null;
  if (req.query.brand && !selectedBrand) {
    return res.json({ data: [], meta: { page, limit, total: 0, totalPages: 1 }, filters: { brands } });
  }

  const allowedBrandIds = selectedBrand ? [selectedBrand._id] : brands.map((brand) => brand._id);
  const brandMap = new Map(brands.map((brand) => [brand._id.toString(), brand]));
  const products = await Product.find({ isActive: true, brandId: { $in: allowedBrandIds } }).sort('-createdAt');
  const search = req.query.search?.trim().toLowerCase();
  const matches = products
    .filter((product) => !search || `${product.name} ${product.modelCode}`.toLowerCase().includes(search))
    .map((product) => ({ product, matchingVariants: getFilteredVariants(product.variants, req.query) }))
    .filter(({ matchingVariants }) => matchingVariants.length > 0);

  const sort = req.query.sort || 'newest';
  if (sort === 'price_asc') matches.sort((a, b) => Math.min(...a.matchingVariants.map((variant) => variant.price)) - Math.min(...b.matchingVariants.map((variant) => variant.price)));
  if (sort === 'price_desc') matches.sort((a, b) => Math.min(...b.matchingVariants.map((variant) => variant.price)) - Math.min(...a.matchingVariants.map((variant) => variant.price)));
  if (!['newest', 'price_asc', 'price_desc'].includes(sort)) throw new ApiError(400, 'Kiểu sắp xếp không hợp lệ.');

  const total = matches.length;
  const data = matches.slice((page - 1) * limit, page * limit)
    .map(({ product }) => publicProduct(product, brandMap.get(product.brandId.toString())));
  res.json({ data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, filters: { brands } });
});

export const getPublicProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true });
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  const brand = await Brand.findOne({ _id: product.brandId, isActive: true }).select('name slug logoUrl');
  if (!brand) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  res.json({ data: publicProduct(product, brand) });
});

export const getAdminProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().populate('brandId', 'name slug isActive').sort('-createdAt');
  res.json({ data: products });
});

export const getAdminProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('brandId', 'name slug isActive');
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  res.json({ data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, modelCode, brandId, description = '', specifications = {}, isActive = true } = req.body;
  if (!name?.trim() || !modelCode?.trim() || !brandId) throw new ApiError(400, 'Tên sản phẩm, mã sản phẩm và hãng là bắt buộc.');
  await requireBrand(brandId);
  const variants = await validateVariants(req.body.variants);

  const product = await Product.create({
    name: name.trim(), modelCode: modelCode.trim(), brandId, description: description.trim(), specifications, variants, isActive,
  });
  await product.populate('brandId', 'name slug isActive');
  res.status(201).json({ message: 'Đã tạo sản phẩm.', data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  if (req.body.brandId !== undefined) await requireBrand(req.body.brandId);
  if (req.body.variants !== undefined) product.variants = await validateVariants(req.body.variants, product._id);

  applyProductFields(product, req.body);
  await product.save();
  await product.populate('brandId', 'name slug isActive');
  res.json({ message: 'Đã cập nhật sản phẩm.', data: product });
});

export const updateProductStatus = asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw new ApiError(400, 'isActive phải là true hoặc false.');
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');

  product.isActive = req.body.isActive;
  await product.save();
  res.json({ message: 'Đã cập nhật trạng thái sản phẩm.', data: product });
});

export const uploadProductImages = asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured) throw new ApiError(503, 'Cloudinary chưa được cấu hình trên server.');
  if (!req.files?.length) throw new ApiError(400, 'Vui lòng chọn ít nhất một ảnh.');
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');

  const results = await Promise.all(req.files.map((file) => uploadBuffer(file, product._id)));
  product.images.push(...results.map((result, index) => ({
    url: result.secure_url,
    publicId: result.public_id,
    alt: req.files[index].originalname,
  })));
  await product.save();
  res.status(201).json({ message: 'Đã tải ảnh lên Cloudinary.', data: product });
});

export const deleteProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  const image = product.images.id(req.params.imageId);
  if (!image) throw new ApiError(404, 'Không tìm thấy ảnh.');
  if (isCloudinaryConfigured && image.publicId) await cloudinary.uploader.destroy(image.publicId, { resource_type: 'image' });

  product.images.pull(image._id);
  await product.save();
  res.json({ message: 'Đã xóa ảnh.', data: product });
});

export const addVariant = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  const variant = parseVariant(req.body);
  if (product.variants.some((item) => item.sku === variant.sku)) throw new ApiError(409, 'SKU đã tồn tại trong sản phẩm này.');
  const duplicate = await Product.exists({ _id: { $ne: product._id }, 'variants.sku': variant.sku });
  if (duplicate) throw new ApiError(409, 'SKU đã được dùng cho sản phẩm khác.');

  product.variants.push(variant);
  await product.save();
  res.status(201).json({ message: 'Đã thêm biến thể.', data: product });
});

export const updateVariant = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
  const existing = product.variants.id(req.params.variantId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy biến thể.');
  const replacement = parseVariant({ ...existing.toObject(), ...req.body });
  if (product.variants.some((item) => item._id.toString() !== existing._id.toString() && item.sku === replacement.sku)) {
    throw new ApiError(409, 'SKU đã tồn tại trong sản phẩm này.');
  }
  const duplicate = await Product.exists({ _id: { $ne: product._id }, 'variants.sku': replacement.sku });
  if (duplicate) throw new ApiError(409, 'SKU đã được dùng cho sản phẩm khác.');

  existing.set(replacement);
  await product.save();
  res.json({ message: 'Đã cập nhật biến thể.', data: product });
});
