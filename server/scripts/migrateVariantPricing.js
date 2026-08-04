import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';

const legacyCostRatio = Number(process.env.LEGACY_COST_RATIO || 0.9);
const applyChanges = process.argv.includes('--apply');

function estimateCost(salePrice) {
  return Math.max(0, Math.round((salePrice * legacyCostRatio) / 1000) * 1000);
}

try {
  if (!Number.isFinite(legacyCostRatio) || legacyCostRatio < 0) throw new Error('LEGACY_COST_RATIO phải là số không âm.');
  await connectDatabase();

  const rawProducts = await Product.collection.find({}).toArray();
  const variantCostById = new Map();
  const productUpdates = rawProducts.map((product) => {
    let changed = false;
    const variants = product.variants.map((rawVariant) => {
      const { price, compareAtPrice, colorHex, costPrice, salePrice, ...variant } = rawVariant;
      const normalizedSalePrice = Number.isFinite(salePrice) ? salePrice : Number(price);
      if (!Number.isFinite(normalizedSalePrice) || normalizedSalePrice < 0) throw new Error(`Biến thể ${rawVariant.sku || rawVariant._id} không có giá bán hợp lệ.`);
      const normalizedCostPrice = Number.isFinite(costPrice) ? costPrice : estimateCost(normalizedSalePrice);
      variantCostById.set(String(rawVariant._id), normalizedCostPrice);
      if (price !== undefined || compareAtPrice !== undefined || colorHex !== undefined || costPrice !== normalizedCostPrice || salePrice !== normalizedSalePrice) changed = true;
      return { ...variant, costPrice: normalizedCostPrice, salePrice: normalizedSalePrice };
    });
    return changed ? { updateOne: { filter: { _id: product._id }, update: { $set: { variants } } } } : null;
  }).filter(Boolean);

  const rawOrders = await Order.collection.find({}).toArray();
  const orderUpdates = rawOrders.map((order) => {
    let changed = false;
    const items = order.items.map((rawItem) => {
      if (Number.isFinite(rawItem.unitCost)) return rawItem;
      changed = true;
      return { ...rawItem, unitCost: variantCostById.get(String(rawItem.variantId)) ?? estimateCost(rawItem.unitPrice) };
    });
    return changed ? { updateOne: { filter: { _id: order._id }, update: { $set: { items } } } } : null;
  }).filter(Boolean);

  if (applyChanges) {
    if (productUpdates.length) await Product.collection.bulkWrite(productUpdates);
    if (orderUpdates.length) await Order.collection.bulkWrite(orderUpdates);
  }
  console.log(JSON.stringify({ mode: applyChanges ? 'applied' : 'dry-run', legacyCostRatio, productsUpdated: productUpdates.length, ordersUpdated: orderUpdates.length }));
} finally {
  await mongoose.disconnect();
}
