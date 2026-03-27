
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Final Image Sync ---');

  // 1. Get all SKUs with REAL images
  const allSkus = await prisma.sku.findMany({
    where: {
      AND: [
        { imageUrl: { not: null } },
        { imageUrl: { not: "" } },
        { imageUrl: { not: "null" } }
      ]
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

  // 2. Fetch ALL SKUs that need fixing
  const skusToFix = await prisma.sku.findMany({
    where: {
      OR: [
        { imageUrl: null },
        { imageUrl: "" },
        { imageUrl: "null" }
      ]
    }
  });

  console.log(`Found ${skusToFix.length} SKUs needing image restoration.`);

  let updated = 0;
  for (const sku of skusToFix) {
    const canonical = imageMap.get(sku.code);
    if (canonical) {
      await prisma.sku.update({
        where: { id: sku.id },
        data: { imageUrl: canonical }
      });
      updated++;
    }
  }

  console.log(`Successfully restored ${updated} images across all stores.`);
  console.log('--- Sync Complete ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
