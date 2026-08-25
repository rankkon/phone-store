import mongoose from 'mongoose';

const returnHistorySchema = new mongoose.Schema({
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], required: true },
  note: { type: String, trim: true, default: '' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changedAt: { type: Date, default: Date.now, required: true },
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING', index: true },
  statusHistory: { type: [returnHistorySchema], default: [] },
}, { timestamps: true });

returnRequestSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('ReturnRequest', returnRequestSchema);
