import 'dotenv/config';
import { connectDatabase } from '../src/config/db.js';
import Brand from '../src/models/Brand.js';
import Product from '../src/models/Product.js';
import Voucher from '../src/models/Voucher.js';
import { ensureDemoAccounts } from '../src/services/demoAccountService.js';

async function seed() {
  await connectDatabase();

  const demoAccountResult = await ensureDemoAccounts();

  let apple = await Brand.findOne({ name: 'Apple' });
  if (!apple) apple = await Brand.create({ name: 'Apple' });
  let samsung = await Brand.findOne({ name: 'Samsung' });
  if (!samsung) samsung = await Brand.create({ name: 'Samsung' });

  const sampleProducts = [
    {
      name: 'iPhone 16 Pro', modelCode: 'IPHONE-16-PRO', brandId: apple._id,
      description: 'Hiệu năng mạnh mẽ, camera chuyên nghiệp và thiết kế titan cao cấp.',
      specifications: { chip: 'Apple A18 Pro', battery: '3582 mAh', screen: '6.3 inch OLED', rearCamera: '48 MP', frontCamera: '12 MP', operatingSystem: 'iOS 18' },
      variants: [
        { sku: 'IP16P-128-BLK', ram: '8GB', storage: '128GB', color: 'Titan Đen', costPrice: 26090000, salePrice: 28990000, stock: 12 },
        { sku: 'IP16P-256-NT', ram: '8GB', storage: '256GB', color: 'Titan Tự Nhiên', costPrice: 28710000, salePrice: 31990000, stock: 8 },
      ],
    },
    {
      name: 'Samsung Galaxy S25', modelCode: 'GALAXY-S25', brandId: samsung._id,
      description: 'Thiết kế nhỏ gọn, hiệu năng cao và màn hình AMOLED sắc nét.',
      specifications: { chip: 'Snapdragon 8 Elite', battery: '4000 mAh', screen: '6.2 inch AMOLED', rearCamera: '50 MP', frontCamera: '12 MP', operatingSystem: 'Android 15' },
      variants: [
        { sku: 'S25-256-BLU', ram: '12GB', storage: '256GB', color: 'Xanh Navy', costPrice: 20690000, salePrice: 22990000, stock: 15 },
      ],
    },
  ];

  for (const product of sampleProducts) {
    if (!(await Product.exists({ modelCode: product.modelCode }))) await Product.create(product);
  }

  if (!(await Voucher.exists({ code: 'WELCOME10' }))) {
    await Voucher.create({
      code: 'WELCOME10', type: 'PERCENT', value: 10, minOrderValue: 1000000, maxDiscount: 1000000,
      startAt: new Date('2024-01-01'), endAt: new Date('2035-12-31'), usageLimit: 1000,
    });
  }

  console.log('Seed completed. Demo accounts synchronized.', demoAccountResult);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
