import mongoose from 'mongoose';
import Favorite from '../models/Favorite.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function serializeProduct(product) {
  if (!product) return null;
  const variants = product.variants
    .filter((variant) => variant.isActive)
    .map(({ _id, sku, ram, storage, color, salePrice, stock, isActive }) => ({ _id, sku, ram, storage, color, salePrice, stock, isActive }));
  const availableVariants = variants.filter((variant) => variant.stock > 0);
  const currentPrice = variants.length ? Math.min(...variants.map((variant) => variant.salePrice)) : null;
  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    images: product.images,
    variants,
    isActive: product.isActive,
    isAvailable: product.isActive && availableVariants.length > 0,
    currentPrice,
    brand: product.brandId ? {
      _id: product.brandId._id,
      name: product.brandId.name,
      slug: product.brandId.slug,
    } : null,
  };
}

function serializeFavorite(favorite) {
  const product = serializeProduct(favorite.productId);
  const priceChange = product?.currentPrice === null || product?.currentPrice === undefined
    ? null
    : product.currentPrice - favorite.savedPrice;
  return {
    _id: favorite._id,
    productId: favorite.productId?._id || favorite.productId,
    savedPrice: favorite.savedPrice,
    currentPrice: product?.currentPrice ?? null,
    priceChange,
    createdAt: favorite.createdAt,
    product,
  };
}

export const getFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'productId',
      select: 'name slug images variants isActive brandId',
      populate: { path: 'brandId', select: 'name slug isActive' },
    });
  res.json({ data: favorites.map(serializeFavorite) });
});

export const addFavorite = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Sản phẩm yêu thích không hợp lệ.');
  }

  const product = await Product.findOne({ _id: productId, isActive: true }).select('variants');
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm đang kinh doanh.');
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  if (activeVariants.length === 0) throw new ApiError(400, 'Sản phẩm hiện chưa có phiên bản đang kinh doanh.');
  const savedPrice = Math.min(...activeVariants.map((variant) => variant.salePrice));

  const existing = await Favorite.findOne({ userId: req.user._id, productId });
  if (existing) {
    return res.json({ message: 'Sản phẩm đã có trong danh sách yêu thích.', data: { _id: existing._id, productId: existing.productId } });
  }

  try {
    const favorite = await Favorite.create({ userId: req.user._id, productId, savedPrice });
    return res.status(201).json({ message: 'Đã thêm vào danh sách yêu thích.', data: { _id: favorite._id, productId: favorite.productId } });
  } catch (error) {
    if (error?.code === 11000) {
      const favorite = await Favorite.findOne({ userId: req.user._id, productId });
      return res.json({ message: 'Sản phẩm đã có trong danh sách yêu thích.', data: { _id: favorite._id, productId: favorite.productId } });
    }
    throw error;
  }
});

export const removeFavorite = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) {
    throw new ApiError(400, 'Sản phẩm yêu thích không hợp lệ.');
  }
  const favorite = await Favorite.findOneAndDelete({ userId: req.user._id, productId: req.params.productId });
  if (!favorite) throw new ApiError(404, 'Sản phẩm không có trong danh sách yêu thích.');
  res.json({ message: 'Đã xóa khỏi danh sách yêu thích.' });
});
