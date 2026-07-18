import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: [true, 'Mã voucher là bắt buộc.'], unique: true, trim: true, uppercase: true },
  type: { type: String, required: true, enum: ['PERCENT', 'FIXED'] },
  value: { type: Number, required: true, min: [0, 'Giá trị giảm không được âm.'] },
  minOrderValue: { type: Number, min: [0, 'Giá trị đơn tối thiểu không được âm.'], default: 0 },
  maxDiscount: { type: Number, min: [0, 'Mức giảm tối đa không được âm.'], default: null },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  usageLimit: { type: Number, required: true, min: [1, 'Số lượt sử dụng phải từ 1.'], validate: { validator: Number.isInteger, message: 'Số lượt sử dụng phải là số nguyên.' } },
  usedCount: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

voucherSchema.pre('validate', function validateDates(next) {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate('endAt', 'Ngày kết thúc phải sau ngày bắt đầu.');
  }
  next();
});

export default mongoose.model('Voucher', voucherSchema);
