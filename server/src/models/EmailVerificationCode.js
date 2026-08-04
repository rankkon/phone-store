import mongoose from 'mongoose';

const emailVerificationCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  purpose: { type: String, required: true, enum: ['EMAIL_VERIFICATION', 'PASSWORD_CHANGE', 'PASSWORD_RESET'] },
  codeHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  sentAt: { type: Date, required: true, default: Date.now },
  attempts: { type: Number, required: true, default: 0, min: 0 },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

emailVerificationCodeSchema.index({ userId: 1, purpose: 1 }, { unique: true });
emailVerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('EmailVerificationCode', emailVerificationCodeSchema);
