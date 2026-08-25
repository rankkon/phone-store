import mongoose from 'mongoose';

const stockAdjustmentSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  productName: { type: String, required: true, trim: true, maxlength: 180 },
  sku: { type: String, required: true, trim: true, maxlength: 50 },
  variantLabel: { type: String, required: true, trim: true, maxlength: 160 },
  type: { type: String, enum: ['INITIAL', 'IMPORT', 'ADJUSTMENT'], required: true },
  change: { type: Number, required: true, validate: { validator: Number.isInteger, message: 'Mức thay đổi tồn kho phải là số nguyên.' } },
  previousStock: { type: Number, required: true, min: 0 },
  resultingStock: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

stockAdjustmentSchema.index({ productId: 1, variantId: 1, createdAt: -1 });

export default mongoose.model('StockAdjustment', stockAdjustmentSchema);
