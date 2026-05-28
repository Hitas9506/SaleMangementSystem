import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: 'Điện', icon: '⚡', prefix: 'DI' },
  { name: 'Nước', icon: '💧', prefix: 'NU' },
  { name: 'Nhôm Kính', icon: '🪟', prefix: 'NK' },
  { name: 'Xây dựng', icon: '🧱', prefix: 'XD' },
  { name: 'Khác', icon: '📦', prefix: 'KH' },
];

const suppliers = [
  { name: 'Cadivi', phone: '02838194300', note: 'Dây cáp điện dân dụng' },
  { name: 'Tiền Phong', phone: '02253882999', note: 'Ống nhựa và phụ kiện nước' },
  { name: 'Nam Hải', phone: '0900000000', note: 'Nhôm kính và vật tư xây dựng' },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon },
      create: { name: category.name, icon: category.icon },
    });
  }

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { name: supplier.name },
      update: { phone: supplier.phone, note: supplier.note },
      create: supplier,
    });
  }

  const categoryRows = await prisma.category.findMany();
  const categoryByName = new Map(categoryRows.map((category) => [category.name, category]));

  const products = [
    {
      name: 'Dây điện Cadivi CV 2.5mm2',
      sku: 'DI-001',
      unit: 'mét',
      retailPrice: 15000,
      stockQuantity: 150,
      lowStockThreshold: 20,
      technicalSpecs: 'Ruột đồng, tiết diện 2.5mm2, vỏ PVC, chịu nhiệt 70°C',
      categoryName: 'Điện',
    },
    {
      name: 'Ổ cắm điện đôi âm tường',
      sku: 'DI-002',
      unit: 'cái',
      retailPrice: 45000,
      stockQuantity: 35,
      lowStockThreshold: 8,
      technicalSpecs: 'Ổ cắm đôi 2 chấu, mặt nhựa chống cháy',
      categoryName: 'Điện',
    },
    {
      name: 'Ống PVC Tiền Phong D21',
      sku: 'NU-001',
      unit: 'cây',
      retailPrice: 35000,
      stockQuantity: 60,
      lowStockThreshold: 10,
      technicalSpecs: 'Đường kính 21mm, dài 4m, dùng cấp thoát nước dân dụng',
      categoryName: 'Nước',
    },
    {
      name: 'Van cầu đồng DN25',
      sku: 'NU-002',
      unit: 'cái',
      retailPrice: 85000,
      stockQuantity: 8,
      lowStockThreshold: 5,
      technicalSpecs: 'Van đồng ren trong, đường kính DN25',
      categoryName: 'Nước',
    },
    {
      name: 'Thanh nhôm Xingfa hệ 55',
      sku: 'NK-001',
      unit: 'mét',
      retailPrice: 120000,
      stockQuantity: 22,
      lowStockThreshold: 5,
      technicalSpecs: 'Nhôm định hình hệ 55, sơn tĩnh điện',
      categoryName: 'Nhôm Kính',
    },
    {
      name: 'Bản lề cửa kính thủy lực',
      sku: 'NK-002',
      unit: 'bộ',
      retailPrice: 250000,
      stockQuantity: 4,
      lowStockThreshold: 3,
      technicalSpecs: 'Bản lề sàn cho cửa kính cường lực',
      categoryName: 'Nhôm Kính',
    },
    {
      name: 'Xi măng Hà Tiên PCB40',
      sku: 'XD-001',
      unit: 'bao',
      retailPrice: 95000,
      stockQuantity: 40,
      lowStockThreshold: 10,
      technicalSpecs: 'Bao 50kg, mác PCB40',
      categoryName: 'Xây dựng',
    },
    {
      name: 'Keo silicone Apollo A500',
      sku: 'KH-001',
      unit: 'chai',
      retailPrice: 65000,
      stockQuantity: 18,
      lowStockThreshold: 6,
      technicalSpecs: 'Keo silicone trung tính, dùng kính và nhôm',
      categoryName: 'Khác',
    },
  ];

  for (const product of products) {
    const category = categoryByName.get(product.categoryName);

    if (!category) {
      throw new Error(`Missing category: ${product.categoryName}`);
    }

    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        unit: product.unit,
        retailPrice: product.retailPrice,
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        technicalSpecs: product.technicalSpecs,
        categoryId: category.id,
      },
      create: {
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        retailPrice: product.retailPrice,
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        technicalSpecs: product.technicalSpecs,
        categoryId: category.id,
      },
    });
  }

  const existingSettings = await prisma.storeSetting.findFirst();
  if (!existingSettings) {
    await prisma.storeSetting.create({
      data: {
        storeName: 'Cửa hàng Vật tư Gia đình',
        zaloNotifyHour: 21,
        zaloNotifyEnabled: true,
        defaultLowStockThreshold: 5,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
