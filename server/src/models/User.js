import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  recipientName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  province: { type: String, trim: true, default: '' },
  district: { type: String, trim: true, default: '' },
  ward: { type: String, trim: true, default: '' },
  detail: { type: String, trim: true, default: '' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: [true, 'Họ tên là bắt buộc.'], trim: true, maxlength: 100 },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, trim: true, default: '', maxlength: 20 },
  address: { type: addressSchema, default: () => ({}) },
  avatarUrl: { type: String, trim: true, default: '' },
  avatarPublicId: { type: String, trim: true, default: '' },
  role: { type: String, enum: ['CUSTOMER', 'STAFF', 'ADMIN'], default: 'CUSTOMER' },
  status: { type: String, enum: ['ACTIVE', 'BLOCKED'], default: 'ACTIVE' },
  blockReason: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date, default: null },
  refreshTokenHash: { type: String, default: '', select: false },
  refreshTokenExpiresAt: { type: Date, default: null, select: false },
}, { timestamps: true });

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    delete returnedObject.passwordHash;
    delete returnedObject.refreshTokenHash;
    delete returnedObject.refreshTokenExpiresAt;
    delete returnedObject.__v;
    return returnedObject;
  },
});

export default mongoose.model('User', userSchema);
