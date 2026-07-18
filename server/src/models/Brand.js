import mongoose from 'mongoose';
import { makeSlug } from '../utils/slug.js';

const brandSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Tên hãng là bắt buộc.'], trim: true, unique: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, index: true },
  logoUrl: { type: String, trim: true, default: '' },
  logoPublicId: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

brandSchema.pre('validate', function setSlug(next) {
  if (this.isModified('name')) this.slug = makeSlug(this.name);
  next();
});

export default mongoose.model('Brand', brandSchema);
