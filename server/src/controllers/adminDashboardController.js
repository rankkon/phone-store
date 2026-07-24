import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/admin/dashboard/overview
export const getOverview = asyncHandler(async (req, res) => {
  const [totalProducts, totalUsers, totalOrders, revenueData, statusCounts] = await Promise.all([
    Product.countDocuments(),
    User.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]),
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const totalRevenue = revenueData[0]?.total || 0;
  const statusMap = statusCounts.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  res.json({
    data: {
      totalProducts,
      totalUsers,
      totalOrders,
      totalRevenue,
      statusBreakdown: statusMap
    }
  });
});

// GET /api/admin/dashboard/revenue
export const getRevenueStats = asyncHandler(async (req, res) => {
  const { by = 'month', startDate, endDate } = req.query;

  const matchFilter = { status: 'COMPLETED' };

  if (startDate || endDate) {
    matchFilter.createdAt = {};
    if (startDate) {
      matchFilter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
  } else {
    // Giá trị mặc định nếu không truyền khoảng thời gian
    if (by === 'day') {
      const past30Days = new Date();
      past30Days.setDate(past30Days.getDate() - 29);
      past30Days.setHours(0, 0, 0, 0);
      matchFilter.createdAt = { $gte: past30Days };
    } else if (by === 'month') {
      const past12Months = new Date();
      past12Months.setMonth(past12Months.getMonth() - 11);
      past12Months.setDate(1);
      past12Months.setHours(0, 0, 0, 0);
      matchFilter.createdAt = { $gte: past12Months };
    }
  }

  let groupFields = {};
  let sortFields = {};

  if (by === 'day') {
    groupFields = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    };
    sortFields = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
  } else if (by === 'quarter') {
    groupFields = {
      year: { $year: '$createdAt' },
      quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } }
    };
    sortFields = { '_id.year': 1, '_id.quarter': 1 };
  } else if (by === 'year') {
    groupFields = {
      year: { $year: '$createdAt' }
    };
    sortFields = { '_id.year': 1 };
  } else {
    // Mặc định gom nhóm theo tháng (month)
    groupFields = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' }
    };
    sortFields = { '_id.year': 1, '_id.month': 1 };
  }

  const revenueStats = await Order.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: groupFields,
        revenue: { $sum: '$pricing.total' },
        count: { $sum: 1 }
      }
    },
    { $sort: sortFields }
  ]);

  res.json({ data: revenueStats });
});

// GET /api/admin/dashboard/top-products
export const getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    { $match: { status: 'COMPLETED' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: { productId: '$items.productId', variantId: '$items.variantId' },
        productName: { $first: '$items.productName' },
        sku: { $first: '$items.sku' },
        ram: { $first: '$items.ram' },
        storage: { $first: '$items.storage' },
        color: { $first: '$items.color' },
        quantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.lineTotal' }
      }
    },
    { $sort: { quantitySold: -1 } },
    { $limit: 5 }
  ]);

  res.json({ data: topProducts });
});

// GET /api/admin/dashboard/low-stock
export const getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    'variants.stock': { $lt: 10 }
  }).populate('brandId', 'name');

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
          price: variant.price
        });
      }
    }
  }

  // Sắp xếp tăng dần theo lượng hàng tồn
  lowStockItems.sort((a, b) => a.stock - b.stock);

  res.json({ data: lowStockItems });
});
