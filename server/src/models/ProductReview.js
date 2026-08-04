import mongoose from 'mongoose';

const productReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger, message: 'Số sao phải là số nguyên từ 1 đến 5.' } },
  comment: { type: String, required: true, trim: true, minlength: 2, maxlength: 1000 },
}, { timestamps: true });

productReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
productReviewSchema.index({ productId: 1, rating: 1, createdAt: -1 });

export default mongoose.model('ProductReview', productReviewSchema);
