import StockAdjustment from '../models/StockAdjustment.js';

function variantLabel(variant) {
  return [variant.ram, variant.storage, variant.color].filter(Boolean).join(' · ');
}

export async function recordStockAdjustment({ product, variant, type, change, previousStock, resultingStock, reason, changedBy }) {
  return StockAdjustment.create({
    productId: product._id,
    variantId: variant._id,
    productName: product.name,
    sku: variant.sku,
    variantLabel: variantLabel(variant),
    type,
    change,
    previousStock,
    resultingStock,
    reason,
    changedBy,
  });
}

export async function recordInitialStock(product, changedBy, variants = product.variants) {
  const initialVariants = variants.filter((variant) => variant.stock > 0);
  if (initialVariants.length === 0) return [];
  return StockAdjustment.insertMany(initialVariants.map((variant) => ({
    productId: product._id,
    variantId: variant._id,
    productName: product.name,
    sku: variant.sku,
    variantLabel: variantLabel(variant),
    type: 'INITIAL',
    change: variant.stock,
    previousStock: 0,
    resultingStock: variant.stock,
    reason: 'Tồn kho ban đầu khi tạo biến thể.',
    changedBy,
  })));
}
