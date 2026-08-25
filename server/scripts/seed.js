import 'dotenv/config';
import { connectDatabase } from '../src/config/db.js';
import Brand from '../src/models/Brand.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import Voucher from '../src/models/Voucher.js';
import { ensureDemoAccounts } from '../src/services/demoAccountService.js';

const brandDefinitions = [
  { name: 'Apple', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { name: 'Samsung', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
  { name: 'Xiaomi', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg' },
  { name: 'OPPO', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/OPPO_LOGO_2019.svg' },
  { name: 'vivo', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Vivo_logo_2019.svg' },
  { name: 'Google', logoUrl: 'https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico' },
  { name: 'ASUS', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg' },
  { name: 'realme', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Realme_logo.svg' },
  { name: 'HONOR', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Honor_Logo.svg' },
  { name: 'Nothing', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Nothing_logo.svg' },
];

const productDefinitions = [
  {
    brand: 'Apple', name: 'iPhone 16', modelCode: 'IPHONE-16',
    description: 'iPhone thế hệ mới với chip A18, Dynamic Island và hệ thống camera 48 MP.',
    imageUrl: 'https://images.unsplash.com/photo-1592286927505-1def25115558?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Apple A18', battery: '3561 mAh', screen: '6.1 inch OLED', rearCamera: '48 MP', frontCamera: '12 MP', operatingSystem: 'iOS 18' },
    variants: [
      { sku: 'IP16-128-BLK', ram: '8GB', storage: '128GB', color: 'Đen', costPrice: 19400000, salePrice: 21990000, stock: 26 },
      { sku: 'IP16-256-WHT', ram: '8GB', storage: '256GB', color: 'Trắng', costPrice: 22000000, salePrice: 24990000, stock: 18 },
      { sku: 'IP16-256-PNK', ram: '8GB', storage: '256GB', color: 'Hồng', costPrice: 22000000, salePrice: 24990000, stock: 15 },
    ],
  },
  {
    brand: 'Apple', name: 'iPhone 16 Pro Max', modelCode: 'IPHONE-16-PRO-MAX',
    description: 'Phiên bản iPhone cao cấp màn hình lớn, khung titan và camera zoom quang học 5x.',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Apple A18 Pro', battery: '4685 mAh', screen: '6.9 inch OLED', rearCamera: '48 MP', frontCamera: '12 MP', operatingSystem: 'iOS 18' },
    variants: [
      { sku: 'IP16PM-256-BLK', ram: '8GB', storage: '256GB', color: 'Titan Đen', costPrice: 29000000, salePrice: 34990000, stock: 14 },
      { sku: 'IP16PM-512-NT', ram: '8GB', storage: '512GB', color: 'Titan Tự Nhiên', costPrice: 34400000, salePrice: 40990000, stock: 9 },
    ],
  },
  {
    brand: 'Samsung', name: 'Samsung Galaxy S25 Ultra', modelCode: 'GALAXY-S25-ULTRA',
    description: 'Flagship Galaxy với S Pen, camera 200 MP và hiệu năng Snapdragon 8 Elite.',
    imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Snapdragon 8 Elite', battery: '5000 mAh', screen: '6.9 inch AMOLED', rearCamera: '200 MP', frontCamera: '12 MP', operatingSystem: 'Android 15' },
    variants: [
      { sku: 'S25U-256-TI', ram: '12GB', storage: '256GB', color: 'Titan Xám', costPrice: 27600000, salePrice: 30990000, stock: 17 },
      { sku: 'S25U-512-BLU', ram: '12GB', storage: '512GB', color: 'Xanh Titan', costPrice: 31800000, salePrice: 35990000, stock: 11 },
    ],
  },
  {
    brand: 'Samsung', name: 'Samsung Galaxy A56 5G', modelCode: 'GALAXY-A56-5G',
    description: 'Điện thoại tầm trung cân bằng với màn hình AMOLED 120 Hz và camera OIS.',
    imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Exynos 1580', battery: '5000 mAh', screen: '6.7 inch AMOLED', rearCamera: '50 MP', frontCamera: '12 MP', operatingSystem: 'Android 15' },
    variants: [
      { sku: 'A56-128-GRY', ram: '8GB', storage: '128GB', color: 'Xám', costPrice: 7800000, salePrice: 9290000, stock: 35 },
      { sku: 'A56-256-OLV', ram: '8GB', storage: '256GB', color: 'Xanh Olive', costPrice: 9100000, salePrice: 10690000, stock: 29 },
    ],
  },
  {
    brand: 'Xiaomi', name: 'Xiaomi 15', modelCode: 'XIAOMI-15',
    description: 'Flagship nhỏ gọn với Snapdragon 8 Elite, Leica camera và sạc nhanh 90 W.',
    imageUrl: 'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Snapdragon 8 Elite', battery: '5240 mAh', screen: '6.36 inch OLED', rearCamera: '50 MP', frontCamera: '32 MP', operatingSystem: 'HyperOS 2' },
    variants: [
      { sku: 'MI15-256-BLK', ram: '12GB', storage: '256GB', color: 'Đen', costPrice: 18600000, salePrice: 21490000, stock: 21 },
      { sku: 'MI15-512-GRN', ram: '12GB', storage: '512GB', color: 'Xanh Lá', costPrice: 21500000, salePrice: 24490000, stock: 13 },
    ],
  },
  {
    brand: 'Xiaomi', name: 'Redmi Note 14 Pro 5G', modelCode: 'REDMI-NOTE-14-PRO-5G',
    description: 'Thiết bị 5G phổ thông với camera 200 MP, màn hình cong AMOLED và pin lớn.',
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Dimensity 7300 Ultra', battery: '5110 mAh', screen: '6.67 inch AMOLED', rearCamera: '200 MP', frontCamera: '20 MP', operatingSystem: 'HyperOS' },
    variants: [
      { sku: 'RN14P-256-PRP', ram: '8GB', storage: '256GB', color: 'Tím', costPrice: 7300000, salePrice: 8590000, stock: 38 },
      { sku: 'RN14P-512-BLU', ram: '12GB', storage: '512GB', color: 'Xanh Biển', costPrice: 8600000, salePrice: 9990000, stock: 24 },
    ],
  },
  {
    brand: 'OPPO', name: 'OPPO Find X8', modelCode: 'OPPO-FIND-X8',
    description: 'Camera Hasselblad, chip Dimensity 9400 và thiết kế cao cấp cho người dùng sáng tạo.',
    imageUrl: 'https://images.unsplash.com/photo-1551355738-1875b6664915?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Dimensity 9400', battery: '5630 mAh', screen: '6.59 inch AMOLED', rearCamera: '50 MP', frontCamera: '32 MP', operatingSystem: 'ColorOS 15' },
    variants: [
      { sku: 'FINDX8-256-BLK', ram: '12GB', storage: '256GB', color: 'Đen', costPrice: 18500000, salePrice: 21990000, stock: 18 },
      { sku: 'FINDX8-512-WHT', ram: '16GB', storage: '512GB', color: 'Trắng', costPrice: 21800000, salePrice: 25490000, stock: 10 },
    ],
  },
  {
    brand: 'OPPO', name: 'OPPO Reno13 5G', modelCode: 'OPPO-RENO13-5G',
    description: 'Thiết kế mỏng nhẹ, camera chân dung AI và sạc nhanh SuperVOOC.',
    imageUrl: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Dimensity 8350', battery: '5600 mAh', screen: '6.59 inch AMOLED', rearCamera: '50 MP', frontCamera: '50 MP', operatingSystem: 'ColorOS 15' },
    variants: [
      { sku: 'RENO13-256-WHT', ram: '12GB', storage: '256GB', color: 'Trắng', costPrice: 11100000, salePrice: 12990000, stock: 31 },
      { sku: 'RENO13-512-BLU', ram: '12GB', storage: '512GB', color: 'Xanh', costPrice: 13200000, salePrice: 14990000, stock: 19 },
    ],
  },
  {
    brand: 'vivo', name: 'vivo X200', modelCode: 'VIVO-X200',
    description: 'Camera ZEISS telephoto, pin BlueVolt dung lượng cao và màn hình 120 Hz.',
    imageUrl: 'https://images.unsplash.com/photo-1603921326210-6edd2d60ca68?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Dimensity 9400', battery: '5800 mAh', screen: '6.67 inch AMOLED', rearCamera: '50 MP', frontCamera: '32 MP', operatingSystem: 'Funtouch OS 15' },
    variants: [
      { sku: 'VX200-256-BLU', ram: '12GB', storage: '256GB', color: 'Xanh Đại Dương', costPrice: 18200000, salePrice: 20990000, stock: 22 },
      { sku: 'VX200-512-TI', ram: '16GB', storage: '512GB', color: 'Titan', costPrice: 21500000, salePrice: 24490000, stock: 12 },
    ],
  },
  {
    brand: 'Google', name: 'Google Pixel 9', modelCode: 'PIXEL-9',
    description: 'Trải nghiệm Android thuần, Tensor G4 và các tính năng AI của Google.',
    imageUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Google Tensor G4', battery: '4700 mAh', screen: '6.3 inch OLED', rearCamera: '50 MP', frontCamera: '10.5 MP', operatingSystem: 'Android 15' },
    variants: [
      { sku: 'PIX9-128-OBS', ram: '12GB', storage: '128GB', color: 'Đen Obsidian', costPrice: 16900000, salePrice: 19990000, stock: 16 },
      { sku: 'PIX9-256-ROS', ram: '12GB', storage: '256GB', color: 'Hồng', costPrice: 19100000, salePrice: 22490000, stock: 10 },
    ],
  },
  {
    brand: 'ASUS', name: 'ASUS ROG Phone 9', modelCode: 'ROG-PHONE-9',
    description: 'Gaming phone với màn hình 185 Hz, Snapdragon 8 Elite và hệ thống tản nhiệt nâng cấp.',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Snapdragon 8 Elite', battery: '5800 mAh', screen: '6.78 inch AMOLED', rearCamera: '50 MP', frontCamera: '32 MP', operatingSystem: 'Android 15' },
    variants: [
      { sku: 'ROG9-256-BLK', ram: '12GB', storage: '256GB', color: 'Đen Phantom', costPrice: 21000000, salePrice: 24990000, stock: 14 },
      { sku: 'ROG9-512-BLK', ram: '16GB', storage: '512GB', color: 'Đen Phantom', costPrice: 25100000, salePrice: 29490000, stock: 8 },
    ],
  },
  {
    brand: 'realme', name: 'realme GT 7 Pro', modelCode: 'REALME-GT-7-PRO',
    description: 'Flagship hiệu năng cao với Snapdragon 8 Elite, màn hình sáng và sạc nhanh.',
    imageUrl: 'https://images.unsplash.com/photo-1603898037225-1bea3a0b1c01?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Snapdragon 8 Elite', battery: '6500 mAh', screen: '6.78 inch AMOLED', rearCamera: '50 MP', frontCamera: '16 MP', operatingSystem: 'realme UI 6' },
    variants: [
      { sku: 'GT7P-256-ORG', ram: '12GB', storage: '256GB', color: 'Cam', costPrice: 16300000, salePrice: 19490000, stock: 20 },
      { sku: 'GT7P-512-GRY', ram: '16GB', storage: '512GB', color: 'Xám', costPrice: 19400000, salePrice: 22990000, stock: 12 },
    ],
  },
  {
    brand: 'HONOR', name: 'HONOR Magic7 Pro', modelCode: 'HONOR-MAGIC7-PRO',
    description: 'Camera Falcon, màn hình LTPO OLED và hiệu năng flagship cho nhu cầu cao cấp.',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Snapdragon 8 Elite', battery: '5850 mAh', screen: '6.8 inch OLED', rearCamera: '50 MP', frontCamera: '50 MP', operatingSystem: 'MagicOS 9' },
    variants: [
      { sku: 'MAGIC7P-256-BLK', ram: '12GB', storage: '256GB', color: 'Đen', costPrice: 21400000, salePrice: 24990000, stock: 15 },
      { sku: 'MAGIC7P-512-GRY', ram: '16GB', storage: '512GB', color: 'Xám', costPrice: 24600000, salePrice: 28490000, stock: 9 },
    ],
  },
  {
    brand: 'Nothing', name: 'Nothing Phone 3', modelCode: 'NOTHING-PHONE-3',
    description: 'Thiết kế Glyph đặc trưng, giao diện Nothing OS tối giản và trải nghiệm Android mượt mà.',
    imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=900&q=80',
    specifications: { chip: 'Snapdragon 8s Gen 4', battery: '5150 mAh', screen: '6.7 inch AMOLED', rearCamera: '50 MP', frontCamera: '50 MP', operatingSystem: 'Nothing OS 3' },
    variants: [
      { sku: 'NP3-256-WHT', ram: '12GB', storage: '256GB', color: 'Trắng', costPrice: 14500000, salePrice: 17490000, stock: 23 },
      { sku: 'NP3-512-BLK', ram: '16GB', storage: '512GB', color: 'Đen', costPrice: 16800000, salePrice: 19990000, stock: 14 },
    ],
  },
];

const voucherDefinitions = [
  { code: 'WELCOME10', type: 'PERCENT', value: 10, minOrderValue: 1000000, maxDiscount: 1000000, usageLimit: 1000 },
  { code: 'FREESHIP', type: 'FIXED', value: 30000, minOrderValue: 3000000, maxDiscount: null, usageLimit: 500 },
  { code: 'APPLE500', type: 'FIXED', value: 500000, minOrderValue: 20000000, maxDiscount: null, usageLimit: 120 },
  { code: 'GALAXY8', type: 'PERCENT', value: 8, minOrderValue: 12000000, maxDiscount: 1500000, usageLimit: 200 },
  { code: 'XIAOMI10', type: 'PERCENT', value: 10, minOrderValue: 7000000, maxDiscount: 800000, usageLimit: 250 },
  { code: 'WEEKEND5', type: 'PERCENT', value: 5, minOrderValue: 5000000, maxDiscount: 500000, usageLimit: 300 },
  { code: 'VIP2M', type: 'FIXED', value: 2000000, minOrderValue: 30000000, maxDiscount: null, usageLimit: 80 },
  { code: 'SUMMER2026', type: 'PERCENT', value: 12, minOrderValue: 10000000, maxDiscount: 1200000, usageLimit: 150, endAt: new Date('2026-06-30T23:59:59.999Z'), isActive: false },
];

const reportCustomerDefinitions = [
  ['Nguyễn Minh Anh', 'minh.anh@sample.phonestore.vn', '0901234567'],
  ['Trần Quốc Bảo', 'quoc.bao@sample.phonestore.vn', '0912345678'],
  ['Lê Thu Hà', 'thu.ha@sample.phonestore.vn', '0923456789'],
  ['Phạm Gia Huy', 'gia.huy@sample.phonestore.vn', '0934567890'],
  ['Võ Khánh Linh', 'khanh.linh@sample.phonestore.vn', '0945678901'],
  ['Đặng Hoài Nam', 'hoai.nam@sample.phonestore.vn', '0956789012'],
  ['Bùi Ngọc Mai', 'ngoc.mai@sample.phonestore.vn', '0967890123'],
  ['Hoàng Đức Long', 'duc.long@sample.phonestore.vn', '0978901234'],
];

function productImage(product) {
  return product.images?.[0]?.url || '';
}

function orderItem(product, variantIndex = 0, quantity = 1) {
  const variant = product.variants[variantIndex] || product.variants[0];
  return {
    productId: product._id,
    variantId: variant._id,
    productName: product.name,
    modelCode: product.modelCode,
    sku: variant.sku,
    ram: variant.ram,
    storage: variant.storage,
    color: variant.color,
    imageUrl: productImage(product),
    unitCost: variant.costPrice,
    unitPrice: variant.salePrice,
    quantity,
    lineTotal: variant.salePrice * quantity,
  };
}

async function ensureBrands() {
  const brands = new Map();
  for (const definition of brandDefinitions) {
    let brand = await Brand.findOne({ name: definition.name });
    if (!brand) brand = await Brand.create({ ...definition, isActive: true });
    brands.set(definition.name, brand);
  }
  return brands;
}

async function ensureProducts(brands) {
  let createdCount = 0;
  for (const { brand, imageUrl, ...definition } of productDefinitions) {
    if (await Product.exists({ modelCode: definition.modelCode })) continue;
    await Product.create({
      ...definition,
      brandId: brands.get(brand)._id,
      images: [{ url: imageUrl, publicId: `seed-${definition.modelCode.toLowerCase()}`, alt: definition.name }],
    });
    createdCount += 1;
  }
  return createdCount;
}

async function ensureVouchers() {
  let createdCount = 0;
  for (const definition of voucherDefinitions) {
    if (await Voucher.exists({ code: definition.code })) continue;
    await Voucher.create({
      ...definition,
      startAt: new Date('2026-01-01T00:00:00.000Z'),
      endAt: definition.endAt || new Date('2027-12-31T23:59:59.999Z'),
      isActive: definition.isActive ?? true,
    });
    createdCount += 1;
  }
  return createdCount;
}

async function ensureReportCustomers() {
  const customers = [];
  const passwordHash = await User.hashPassword('customer123');
  for (const [fullName, email, phone] of reportCustomerDefinitions) {
    let customer = await User.findOne({ email });
    if (!customer) {
      customer = await User.create({
        fullName,
        email,
        phone,
        passwordHash,
        role: 'CUSTOMER',
        isEmailVerified: true,
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    }
    customers.push(customer);
  }
  return customers;
}

async function ensureReportOrders(customers, admin) {
  const productMap = new Map((await Product.find({ modelCode: { $in: productDefinitions.map((item) => item.modelCode) } })).map((product) => [product.modelCode, product]));
  const plannedOrders = [
    ['2026-01-08', 'COMPLETED', 'CASH', 'PAID', 'IPHONE-16', 0, 1, 'WELCOME10'],
    ['2026-01-16', 'COMPLETED', 'VNPAY', 'PAID', 'GALAXY-S25-ULTRA', 0, 1, 'GALAXY8'],
    ['2026-02-03', 'COMPLETED', 'COD', 'PAID', 'REDMI-NOTE-14-PRO-5G', 1, 2, 'XIAOMI10'],
    ['2026-02-13', 'COMPLETED', 'BANK_TRANSFER', 'PAID', 'OPPO-FIND-X8', 0, 1, 'WEEKEND5'],
    ['2026-02-28', 'CANCELLED', 'COD', 'FAILED', 'VIVO-X200', 0, 1, null],
    ['2026-03-06', 'COMPLETED', 'CARD', 'PAID', 'ROG-PHONE-9', 1, 1, 'VIP2M'],
    ['2026-03-19', 'COMPLETED', 'COD', 'PAID', 'GALAXY-A56-5G', 0, 2, 'FREESHIP'],
    ['2026-03-27', 'COMPLETED', 'VNPAY', 'PAID', 'PIXEL-9', 1, 1, 'WELCOME10'],
    ['2026-04-09', 'COMPLETED', 'CASH', 'PAID', 'OPPO-RENO13-5G', 0, 1, 'WEEKEND5'],
    ['2026-04-22', 'CONFIRMED', 'COD', 'UNPAID', 'NOTHING-PHONE-3', 0, 1, null],
    ['2026-05-05', 'COMPLETED', 'BANK_TRANSFER', 'PAID', 'HONOR-MAGIC7-PRO', 1, 1, 'GALAXY8'],
    ['2026-05-17', 'COMPLETED', 'COD', 'PAID', 'XIAOMI-15', 0, 1, 'XIAOMI10'],
    ['2026-05-29', 'CANCELLED', 'VNPAY', 'FAILED', 'IPHONE-16-PRO-MAX', 0, 1, 'APPLE500'],
    ['2026-06-07', 'COMPLETED', 'CARD', 'PAID', 'GALAXY-S25-ULTRA', 1, 1, 'SUMMER2026'],
    ['2026-06-18', 'SHIPPING', 'COD', 'UNPAID', 'REDMI-NOTE-14-PRO-5G', 0, 1, null],
    ['2026-06-25', 'COMPLETED', 'CASH', 'PAID', 'REALME-GT-7-PRO', 0, 1, 'WEEKEND5'],
    ['2026-07-03', 'COMPLETED', 'VNPAY', 'PAID', 'IPHONE-16', 2, 1, 'WELCOME10'],
    ['2026-07-11', 'CONFIRMED', 'BANK_TRANSFER', 'PAID', 'OPPO-FIND-X8', 1, 1, null],
    ['2026-07-19', 'COMPLETED', 'COD', 'PAID', 'VIVO-X200', 1, 1, 'WEEKEND5'],
    ['2026-07-27', 'PENDING', 'COD', 'UNPAID', 'GALAXY-A56-5G', 1, 1, null],
    ['2026-08-04', 'COMPLETED', 'CARD', 'PAID', 'ROG-PHONE-9', 0, 1, 'VIP2M'],
    ['2026-08-11', 'SHIPPING', 'COD', 'UNPAID', 'NOTHING-PHONE-3', 1, 1, 'FREESHIP'],
  ];

  let createdCount = 0;
  for (let index = 0; index < plannedOrders.length; index += 1) {
    const [dateText, status, method, paymentStatus, modelCode, variantIndex, quantity, voucherCode] = plannedOrders[index];
    const orderCode = `SEED-2026-${String(index + 1).padStart(3, '0')}`;
    if (await Order.exists({ orderCode })) continue;

    const product = productMap.get(modelCode);
    if (!product) continue;
    const customer = customers[index % customers.length];
    const items = [orderItem(product, variantIndex, quantity)];
    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
    const voucher = voucherCode ? await Voucher.findOne({ code: voucherCode }) : null;
    const discount = voucher?.type === 'PERCENT'
      ? Math.min(Math.round(subtotal * voucher.value / 100), voucher.maxDiscount || Number.MAX_SAFE_INTEGER)
      : Math.min(voucher?.value || 0, subtotal);
    const shippingFee = subtotal - discount < 15000000 ? 30000 : 0;
    const createdAt = new Date(`${dateText}T09:00:00.000Z`);
    const completedAt = new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const statusHistory = [{ status: 'PENDING', note: 'Đơn hàng mẫu phục vụ báo cáo được tạo.', changedBy: admin._id, changedAt: createdAt }];
    if (status !== 'PENDING') {
      statusHistory.push({
        status,
        note: status === 'CANCELLED' ? 'Đơn hàng mẫu đã hủy và hoàn tồn kho.' : 'Cập nhật trạng thái đơn hàng mẫu phục vụ báo cáo.',
        changedBy: admin._id,
        changedAt: completedAt,
      });
    }

    await Order.create({
      orderCode,
      userId: customer._id,
      items,
      shippingAddress: {
        recipientName: customer.fullName,
        phone: customer.phone,
        province: index % 2 ? 'Hà Nội' : 'Hồ Chí Minh',
        district: index % 2 ? 'Cầu Giấy' : 'Quận 1',
        ward: index % 2 ? 'Dịch Vọng' : 'Bến Nghé',
        detail: `${index + 10} Đường Mẫu`,
      },
      note: 'Dữ liệu đơn hàng mẫu dùng để kiểm thử báo cáo.',
      pricing: { subtotal, discount, shippingFee, total: subtotal - discount + shippingFee },
      voucher: voucher ? { code: voucher.code, type: voucher.type, value: voucher.value } : null,
      payment: { method, status: paymentStatus, paidAt: paymentStatus === 'PAID' ? completedAt : null },
      status,
      statusHistory,
      stockRestored: status === 'CANCELLED',
      createdAt,
      updatedAt: completedAt,
    });
    createdCount += 1;
  }
  return createdCount;
}

async function seed() {
  await connectDatabase();
  const demoAccountResult = await ensureDemoAccounts();
  const brands = await ensureBrands();
  const productsCreated = await ensureProducts(brands);
  const vouchersCreated = await ensureVouchers();
  const customers = await ensureReportCustomers();
  const admin = await User.findOne({ email: 'admin@gmail.com' });
  const ordersCreated = admin ? await ensureReportOrders(customers, admin) : 0;

  console.log('Seed completed.', { demoAccountResult, productsCreated, vouchersCreated, customers: customers.length, ordersCreated });
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
