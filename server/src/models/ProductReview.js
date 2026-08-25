import mongoose from 'mongoose';

const moderationSchema = new mongoose.Schema({
  note: { type: String, trim: true, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: null },
}, { _id: false });

const adminReplySchema = new mongoose.Schema({
  content: { type: String, trim: true, required: true, maxlength: 1000 },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  repliedAt: { type: Date, required: true, default: Date.now },
}, { _id: false });

const productReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger, message: 'Số sao phải là số nguyên từ 1 đến 5.' } },
  comment: { type: String, required: true, trim: true, minlength: 2, maxlength: 1000 },
  isVisible: { type: Boolean, default: true, index: true },
  moderation: { type: moderationSchema, default: () => ({}) },
  adminReply: { type: adminReplySchema, default: null },
}, { timestamps: true });

productReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
productReviewSchema.index({ productId: 1, rating: 1, createdAt: -1 });

export default mongoose.model('ProductReview', productReviewSchema);
