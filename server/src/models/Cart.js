import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  quantity: { type: Number, required: true, min: [1, 'Số lượng phải từ 1 trở lên.'], validate: { validator: Number.isInteger, message: 'Số lượng phải là số nguyên.' } },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);
