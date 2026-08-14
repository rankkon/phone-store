import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  productName: { type: String, required: true },
  modelCode: { type: String, required: true },
  sku: { type: String, required: true },
  ram: { type: String, required: true },
  storage: { type: String, required: true },
  color: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  unitCost: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  recipientName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  province: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  ward: { type: String, required: true, trim: true },
  detail: { type: String, required: true, trim: true },
}, { _id: false });

const pricingSchema = new mongoose.Schema({
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0 },
  shippingFee: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const voucherSnapshotSchema = new mongoose.Schema({
  code: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: Number, required: true },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['COD', 'VNPAY', 'CASH', 'BANK_TRANSFER', 'CARD'], required: true, default: 'COD' },
  status: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED'], required: true, default: 'UNPAID' },
  requestRefs: { type: [String], default: [] },
  transactionRef: { type: String, default: '' },
  paidAt: { type: Date, default: null },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: '' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  changedAt: { type: Date, required: true, default: Date.now },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  items: { type: [orderItemSchema], required: true, validate: { validator: (items) => items.length > 0, message: 'Đơn hàng phải có ít nhất một sản phẩm.' } },
  shippingAddress: { type: shippingAddressSchema, required: true },
  note: { type: String, trim: true, default: '' },
  pricing: { type: pricingSchema, required: true },
  voucher: { type: voucherSnapshotSchema, default: null },
  payment: { type: paymentSchema, required: true, default: () => ({ method: 'COD', status: 'UNPAID' }) },
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'COMPLETED', 'CANCEL_REQUESTED', 'CANCELLED'], default: 'PENDING', index: true },
  statusHistory: { type: [statusHistorySchema], default: [] },
  stockRestored: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
