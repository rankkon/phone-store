import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductReview from '../models/ProductReview.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function parseRating(value) {
  if (value === undefined) return undefined;
  const rating = Number.parseInt(value, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Số sao phải từ 1 đến 5.');
  }
  return rating;
}

function getReviewInput(body) {
  const rating = parseRating(body.rating);
  const comment = body.comment?.trim();
  if (!rating || !comment) {
    throw new ApiError(400, 'Vui lòng chọn số sao và nhập nhận xét.');
  }
  return { rating, comment };
}

export const getProductReviews = asyncHandler(async (req, res) => {
  if (!req.query.productId) throw new ApiError(400, 'productId là bắt buộc.');
  if (!mongoose.isValidObjectId(req.query.productId)) throw new ApiError(400, 'productId không hợp lệ.');
  const rating = parseRating(req.query.rating);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = { productId: req.query.productId, ...(rating ? { rating } : {}) };

  const [reviews, total, groupedRatings] = await Promise.all([
    ProductReview.find(filter).populate('userId', 'fullName').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ProductReview.countDocuments(filter),
    ProductReview.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(req.query.productId) } },
      { $group: { _id: '$rating', count: { $sum: 1 }, average: { $avg: '$rating' } } },
    ]),
  ]);

  const ratingMap = new Map(groupedRatings.map((item) => [item._id, item.count]));
  const reviewTotal = groupedRatings.reduce((sum, item) => sum + item.count, 0);
  const ratingSum = groupedRatings.reduce((sum, item) => sum + item._id * item.count, 0);
  res.json({
    data: reviews.map((review) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.userId ? { _id: review.userId._id, fullName: review.userId.fullName } : { fullName: 'Khách hàng' },
    })),
    summary: {
      total: reviewTotal,
      average: reviewTotal ? Math.round((ratingSum / reviewTotal) * 10) / 10 : 0,
      breakdown: [5, 4, 3, 2, 1].map((star) => ({ rating: star, count: ratingMap.get(star) || 0 })),
    },
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const { rating, comment } = getReviewInput(req.body);
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'productId không hợp lệ.');
  }
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm để đánh giá.');

  const existingReview = await ProductReview.findOne({ productId, userId: req.user._id });
  if (existingReview) {
    throw new ApiError(409, 'Bạn chỉ được đánh giá một lần cho mỗi sản phẩm.');
  }

  try {
    const review = await ProductReview.create({ productId, userId: req.user._id, rating, comment });
    return res.status(201).json({ message: 'Đã gửi đánh giá. Cảm ơn bạn!', data: review });
  } catch (error) {
    // Chỉ mục unique cũng bảo vệ trường hợp hai yêu cầu được gửi đồng thời.
    if (error?.code === 11000) {
      throw new ApiError(409, 'Bạn chỉ được đánh giá một lần cho mỗi sản phẩm.');
    }
    throw error;
  }
});

export const getMyProductReview = asyncHandler(async (req, res) => {
  const { productId } = req.query;
  if (!productId || !mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'productId không hợp lệ.');
  }

  const review = await ProductReview.findOne({ productId, userId: req.user._id });
  res.json({ data: review });
});

export const updateMyReview = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.reviewId)) {
    throw new ApiError(400, 'Mã đánh giá không hợp lệ.');
  }
  const { rating, comment } = getReviewInput(req.body);
  const review = await ProductReview.findOne({ _id: req.params.reviewId, userId: req.user._id });
  if (!review) throw new ApiError(404, 'Không tìm thấy đánh giá của bạn.');

  review.rating = rating;
  review.comment = comment;
  await review.save();
  res.json({ message: 'Đã cập nhật đánh giá của bạn.', data: review });
});
