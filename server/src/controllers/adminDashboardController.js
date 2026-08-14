import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const supportedPeriods = new Set(['day', 'month', 'year']);

function parseDate(value, label, endOfDay = false) {
  if (!value) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ApiError(400, `${label} không hợp lệ.`);
  return parsed;
}

function getVietnamDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function getDefaultDateRange(by) {
  const now = new Date();
  const { year, month, day } = getVietnamDateParts(now);
  const end = new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999));
  const start = new Date(Date.UTC(year, month - 1, day - 1, 17, 0, 0, 0));
  if (by === 'day') start.setUTCDate(start.getUTCDate() - 13);
  if (by === 'month') { start.setUTCMonth(start.getUTCMonth() - 5); start.setUTCDate(1); }
  if (by === 'year') { start.setUTCFullYear(start.getUTCFullYear() - 4); start.setUTCMonth(0); start.setUTCDate(1); }
  return { start, end };
}

function getPeriodExpression(by) {
  const options = { date: '$createdAt', timezone: VIETNAM_TIMEZONE };
  if (by === 'day') return { year: { $year: options }, month: { $month: options }, day: { $dayOfMonth: options } };
  if (by === 'month') return { year: { $year: options }, month: { $month: options } };
  return { year: { $year: options } };
}

function getPeriodKey(period, by) {
  if (by === 'day') return `${period.year}-${String(period.month).padStart(2, '0')}-${String(period.day).padStart(2, '0')}`;
  if (by === 'month') return `${period.year}-${String(period.month).padStart(2, '0')}`;
  return String(period.year);
}

function getPeriodPresentation(period, by) {
  if (by === 'day') return { label: `${String(period.day).padStart(2, '0')}/${String(period.month).padStart(2, '0')}`, fullLabel: `Ngày ${String(period.day).padStart(2, '0')} tháng ${String(period.month).padStart(2, '0')}, ${period.year}` };
  if (by === 'month') return { label: `T${period.month}/${period.year}`, fullLabel: `Tháng ${period.month} năm ${period.year}` };
  return { label: String(period.year), fullLabel: `Năm ${period.year}` };
}

function buildEmptyPeriods(by, startDate, endDate) {
  const start = getVietnamDateParts(startDate);
  const end = getVietnamDateParts(endDate);
  const cursor = { ...start };
  const periods = [];
  const isAfterEnd = () => (
    cursor.year > end.year
    || (cursor.year === end.year && cursor.month > end.month)
    || (cursor.year === end.year && cursor.month === end.month && cursor.day > end.day)
  );

  while (!isAfterEnd()) {
    const period = by === 'day' ? { ...cursor } : by === 'month' ? { year: cursor.year, month: cursor.month } : { year: cursor.year };
    if (!periods.some((item) => item.key === getPeriodKey(period, by))) {
      periods.push({ key: getPeriodKey(period, by), ...getPeriodPresentation(period, by), revenue: 0, profit: 0, orderCount: 0 });
    }
    if (by === 'day') {
      const date = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day));
      date.setUTCDate(date.getUTCDate() + 1);
      cursor.year = date.getUTCFullYear(); cursor.month = date.getUTCMonth() + 1; cursor.day = date.getUTCDate();
    } else if (by === 'month') {
      cursor.month += 1;
      if (cursor.month === 13) { cursor.month = 1; cursor.year += 1; }
      cursor.day = 1;
    } else {
      cursor.year += 1; cursor.month = 1; cursor.day = 1;
    }
  }
  return periods;
}

function totalCostExpression() {
  return {
    $sum: {
      $map: {
        input: '$items',
        as: 'item',
        in: { $multiply: [{ $ifNull: ['$$item.unitCost', '$$item.unitPrice'] }, '$$item.quantity'] },
      },
    },
  };
}

// GET /api/admin/dashboard/overview
export const getOverview = asyncHandler(async (req, res) => {
  const [totalProducts, totalUsers, totalOrders, financialData, statusCounts, channelData] = await Promise.all([
    Product.countDocuments(),
    User.countDocuments({ role: 'CUSTOMER' }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $project: { revenue: '$pricing.total', cost: totalCostExpression() } },
      { $group: { _id: null, totalRevenue: { $sum: '$revenue' }, totalProfit: { $sum: { $subtract: ['$revenue', '$cost'] } } } },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: {
        _id: { $in: ['$payment.method', ['COD', 'VNPAY']] },
        total: { $sum: '$pricing.total' },
        count: { $sum: 1 }
      } }
    ])
  ]);

  let onlineRevenue = 0;
  let offlineRevenue = 0;
  let onlineCount = 0;
  let offlineCount = 0;

  for (const group of channelData) {
    if (group._id === true) {
      onlineRevenue = group.total;
      onlineCount = group.count;
    } else {
      offlineRevenue = group.total;
      offlineCount = group.count;
    }
  }

  const statusBreakdown = statusCounts.reduce((result, item) => ({ ...result, [item._id]: item.count }), {});
  res.json({ data: {
    totalProducts,
    totalUsers,
    totalOrders,
    totalRevenue: financialData[0]?.totalRevenue || 0,
    totalProfit: financialData[0]?.totalProfit || 0,
    onlineRevenue,
    offlineRevenue,
    onlineCount,
    offlineCount,
    statusBreakdown,
  } });
});

// GET /api/admin/dashboard/revenue?by=day|month|year&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export const getRevenueStats = asyncHandler(async (req, res) => {
  const by = req.query.by || 'month';
  if (!supportedPeriods.has(by)) throw new ApiError(400, 'Kiểu xem biểu đồ phải là ngày, tháng hoặc năm.');

  const defaults = getDefaultDateRange(by);
  const startDate = parseDate(req.query.startDate, 'Ngày bắt đầu') || defaults.start;
  const endDate = parseDate(req.query.endDate, 'Ngày kết thúc', true) || defaults.end;
  if (startDate > endDate) throw new ApiError(400, 'Ngày bắt đầu không được sau ngày kết thúc.');

  const matchConditions = { status: 'COMPLETED', createdAt: { $gte: startDate, $lte: endDate } };
  const source = req.query.source;
  if (source === 'online') {
    matchConditions['payment.method'] = { $in: ['COD', 'VNPAY'] };
  } else if (source === 'offline') {
    matchConditions['payment.method'] = { $in: ['CASH', 'BANK_TRANSFER', 'CARD'] };
  }

  const grouped = await Order.aggregate([
    { $match: matchConditions },
    { $project: { period: getPeriodExpression(by), revenue: '$pricing.total', cost: totalCostExpression() } },
    { $group: {
      _id: '$period',
      revenue: { $sum: '$revenue' },
      profit: { $sum: { $subtract: ['$revenue', '$cost'] } },
      orderCount: { $sum: 1 },
    } },
  ]);

  const dataMap = new Map(grouped.map((item) => [getPeriodKey(item._id, by), item]));
  const data = buildEmptyPeriods(by, startDate, endDate).map((period) => {
    const totals = dataMap.get(period.key);
    return totals ? { ...period, revenue: totals.revenue, profit: totals.profit, orderCount: totals.orderCount } : period;
  });
  res.json({ data, meta: { by, startDate, endDate } });
});

// GET /api/admin/dashboard/top-products
export const getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    { $match: { status: 'COMPLETED' } },
    { $unwind: '$items' },
    { $group: {
      _id: { productId: '$items.productId', variantId: '$items.variantId' },
      productName: { $first: '$items.productName' },
      sku: { $first: '$items.sku' },
      ram: { $first: '$items.ram' },
      storage: { $first: '$items.storage' },
      color: { $first: '$items.color' },
      quantitySold: { $sum: '$items.quantity' },
      totalRevenue: { $sum: '$items.lineTotal' },
      totalProfit: { $sum: { $subtract: ['$items.lineTotal', { $multiply: [{ $ifNull: ['$items.unitCost', '$items.unitPrice'] }, '$items.quantity'] }] } },
    } },
    { $sort: { quantitySold: -1 } },
    { $limit: 5 },
  ]);
  res.json({ data: topProducts });
});

// GET /api/admin/dashboard/low-stock
export const getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({ 'variants.stock': { $lt: 10 } }).populate('brandId', 'name');
  const lowStockItems = [];
  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.stock < 10) {
        lowStockItems.push({
          productId: product._id,
          productName: product.name,
          brandName: product.brandId?.name || 'Không rõ',
          variantId: variant._id,
          sku: variant.sku,
          ram: variant.ram,
          storage: variant.storage,
          color: variant.color,
          stock: variant.stock,
          salePrice: variant.salePrice,
        });
      }
    }
  }
  lowStockItems.sort((a, b) => a.stock - b.stock);
  res.json({ data: lowStockItems });
});
