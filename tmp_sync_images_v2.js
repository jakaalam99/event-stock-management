
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Robust Image Sync ---');

  // 1. Get all SKUs with images from ANY store
  const allSkus = await prisma.sku.findMany({
    where: {
      imageUrl: { not: null, not: "" }
    },
    select: {
      code: true,
      imageUrl: true
    }
  });

  const imageMap = new Map();
  allSkus.forEach(s => {
    if (s.imageUrl) imageMap.set(s.code, s.imageUrl);
  });

  console.log(`Knowledge Base: ${imageMap.size} unique SKU images identified.`);

  // 2. Target stores: 'Mall Taman Anggrek' and others
  const targetStores = ['Mall Of Indonesia', 'Mall Taman Anggrek'];
  
  for (const storeName of targetStores) {
    console.log(`Processing Store: ${storeName}`);
    const missingSkus = await prisma.sku.findMany({
      where: {
        store: { name: storeName },
        OR: [
          { imageUrl: null },
          { imageUrl: "" }
        ]
      }
    });

    console.log(`  Found ${missingSkus.length} missing images in ${storeName}.`);

    let updated = 0;
    for (const sku of missingSkus) {
      const canonical = imageMap.get(sku.code);
      if (canonical) {
        await prisma.sku.update({
          where: { id: sku.id },
          data: { imageUrl: canonical }
        });
        updated++;
      }
    }
    console.log(`  Successfully restored ${updated} images in ${storeName}.`);
  }

  console.log('--- Robust Sync Complete ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
