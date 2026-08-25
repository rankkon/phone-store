import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  savedPrice: { type: Number, required: true, min: 0 },
}, { timestamps: true });

favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
