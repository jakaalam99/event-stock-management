
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Image Sync ---');

  // 1. Get all SKUs that HAVE images
  const skusWithImages = await prisma.sku.findMany({
    where: {
      imageUrl: { not: null, not: "" }
    },
    select: {
      code: true,
      imageUrl: true
    }
  });

  // Create a map of code -> imageUrl
  const imageMap = new Map();
  skusWithImages.forEach(sku => {
    if (sku.imageUrl) {
      imageMap.set(sku.code, sku.imageUrl);
    }
  });

  console.log(`Found ${imageMap.size} unique SKUs with images.`);

  // 2. Get all SKUs that DO NOT have images
  const skusMissingImages = await prisma.sku.findMany({
    where: {
      OR: [
        { imageUrl: null },
        { imageUrl: "" }
      ]
    }
  });

  console.log(`Found ${skusMissingImages.length} SKUs missing images.`);

  let updatedCount = 0;

  // 3. Update missing ones if a match exists in our map
  for (const sku of skusMissingImages) {
    const canonicalImage = imageMap.get(sku.code);
    if (canonicalImage) {
      await prisma.sku.update({
        where: { id: sku.id },
        data: { imageUrl: canonicalImage }
      });
      updatedCount++;
    }
  }

  console.log(`Successfully restored ${updatedCount} images across all stores.`);
  console.log('--- Sync Complete ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
