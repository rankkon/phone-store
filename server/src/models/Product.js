import mongoose from 'mongoose';
import { makeSlug } from '../utils/slug.js';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  alt: { type: String, trim: true, default: '' },
}, { timestamps: false });

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: [true, 'SKU là bắt buộc.'], trim: true, uppercase: true },
  ram: { type: String, required: [true, 'RAM là bắt buộc.'], trim: true },
  storage: { type: String, required: [true, 'Bộ nhớ trong là bắt buộc.'], trim: true },
  color: { type: String, required: [true, 'Màu sắc là bắt buộc.'], trim: true },
  costPrice: { type: Number, required: [true, 'Giá nhập là bắt buộc.'], min: [0, 'Giá nhập không được âm.'] },
  salePrice: { type: Number, required: [true, 'Giá bán là bắt buộc.'], min: [0, 'Giá bán không được âm.'] },
  stock: { type: Number, required: [true, 'Tồn kho là bắt buộc.'], min: [0, 'Tồn kho không được âm.'], validate: { validator: Number.isInteger, message: 'Tồn kho phải là số nguyên.' } },
  isActive: { type: Boolean, default: true },
}, { timestamps: false });

const specificationsSchema = new mongoose.Schema({
  chip: { type: String, trim: true, default: '' },
  battery: { type: String, trim: true, default: '' },
  screen: { type: String, trim: true, default: '' },
  rearCamera: { type: String, trim: true, default: '' },
  frontCamera: { type: String, trim: true, default: '' },
  operatingSystem: { type: String, trim: true, default: '' },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Tên sản phẩm là bắt buộc.'], trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, index: true },
  modelCode: { type: String, required: [true, 'Mã sản phẩm là bắt buộc.'], unique: true, trim: true, uppercase: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Brand' },
  description: { type: String, trim: true, default: '' },
  specifications: { type: specificationsSchema, default: () => ({}) },
  images: { type: [imageSchema], default: [] },
  variants: { type: [variantSchema], validate: { validator: (items) => items.length > 0, message: 'Sản phẩm phải có ít nhất một biến thể.' } },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') || this.isModified('modelCode')) {
    this.slug = makeSlug(`${this.name}-${this.modelCode}`);
  }
  next();
});

productSchema.index({ 'variants.sku': 1 }, { unique: true });

export default mongoose.model('Product', productSchema);
