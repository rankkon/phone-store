import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductReview from '../models/ProductReview.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateFreeText, validateNote } from '../utils/inputValidation.js';

function reviewPayload(review) {
  return {
    _id: review._id,
    rating: review.rating,
    comment: review.comment,
    isVisible: review.isVisible,
    moderation: review.moderation,
    adminReply: review.adminReply ? { content: review.adminReply.content, repliedAt: review.adminReply.repliedAt, repliedBy: review.adminReply.repliedBy } : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: review.userId ? { _id: review.userId._id, fullName: review.userId.fullName, email: review.userId.email } : null,
    product: review.productId ? { _id: review.productId._id, name: review.productId.name, slug: review.productId.slug } : null,
  };
}

export const getAdminReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};
  if (req.query.visibility === 'visible') filter.isVisible = { $ne: false };
  else if (req.query.visibility === 'hidden') filter.isVisible = false;
  else if (req.query.visibility && req.query.visibility !== 'all') throw new ApiError(400, 'Bộ lọc hiển thị không hợp lệ.');
  if (req.query.rating) {
    const rating = Number.parseInt(req.query.rating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'Số sao không hợp lệ.');
    filter.rating = rating;
  }
  if (req.query.search?.trim()) {
    const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = { $regex: search, $options: 'i' };
    const [users, products] = await Promise.all([
      User.find({ $or: [{ fullName: searchRegex }, { email: searchRegex }] }).select('_id'),
      Product.find({ name: searchRegex }).select('_id'),
    ]);
    filter.$or = [
      { userId: { $in: users.map((user) => user._id) } },
      { productId: { $in: products.map((product) => product._id) } },
    ];
  }
  const [reviews, total] = await Promise.all([
    ProductReview.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('userId', 'fullName email').populate('productId', 'name slug').populate('adminReply.repliedBy', 'fullName email'),
    ProductReview.countDocuments(filter),
  ]);
  res.json({ data: reviews.map(reviewPayload), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

export const updateReviewVisibility = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.reviewId)) throw new ApiError(400, 'Mã đánh giá không hợp lệ.');
  if (typeof req.body.isVisible !== 'boolean') throw new ApiError(400, 'isVisible phải là true hoặc false.');
  const review = await ProductReview.findById(req.params.reviewId);
  if (!review) throw new ApiError(404, 'Không tìm thấy đánh giá.');
  review.isVisible = req.body.isVisible;
  review.moderation = {
    note: validateNote(req.body.note, 'Ghi chú kiểm duyệt', 500),
    updatedBy: req.user._id,
    updatedAt: new Date(),
  };
  await review.save();
  await review.populate([{ path: 'userId', select: 'fullName email' }, { path: 'productId', select: 'name slug' }, { path: 'adminReply.repliedBy', select: 'fullName email' }]);
  res.json({ message: review.isVisible ? 'Đã hiển thị đánh giá.' : 'Đã ẩn đánh giá.', data: reviewPayload(review) });
});

export const replyToReview = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.reviewId)) throw new ApiError(400, 'Mã đánh giá không hợp lệ.');
  const content = validateFreeText(req.body.content, 'Phản hồi', { required: true, minLength: 3, maxLength: 1000 });
  const review = await ProductReview.findById(req.params.reviewId);
  if (!review) throw new ApiError(404, 'Không tìm thấy đánh giá.');
  review.adminReply = { content, repliedBy: req.user._id, repliedAt: new Date() };
  await review.save();
  await review.populate([{ path: 'userId', select: 'fullName email' }, { path: 'productId', select: 'name slug' }, { path: 'adminReply.repliedBy', select: 'fullName email' }]);
  res.json({ message: 'Đã lưu phản hồi cho khách hàng.', data: reviewPayload(review) });
});
