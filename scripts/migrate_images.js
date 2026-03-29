const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');

const prisma = new PrismaClient();

async function migrate() {
  console.log('--- Starting Image Migration ---');
  
  const skus = await prisma.sku.findMany({
    where: {
      imageUrl: { not: null, startsWith: 'data:image/' }
    }
  });

  console.log(`Found ${skus.length} SKUs with existing images.`);

  let updatedCount = 0;
  for (const sku of skus) {
    try {
      if (!sku.imageUrl) continue;
      
      // Check size (base64 length approx 1.33 * raw bytes)
      if (sku.imageUrl.length < 50000) { // < ~37KB, skip
        console.log(`Skipping SKU ${sku.code} (already small: ${Math.round(sku.imageUrl.length / 1024)}KB)`);
        continue;
      }

      console.log(`Compressing SKU ${sku.code} (${Math.round(sku.imageUrl.length/1024)}KB)...`);
      
      const parts = sku.imageUrl.split(',');
      const buffer = Buffer.from(parts[1], 'base64');
      
      const compressedBuffer = await sharp(buffer)
        .resize({ width: 600, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
        
      const newImageUrl = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
      
      await prisma.sku.update({
        where: { id: sku.id },
        data: { imageUrl: newImageUrl }
      });

      console.log(`  -> Successfully compressed to ${Math.round(newImageUrl.length/1024)}KB`);
      updatedCount++;
    } catch (err) {
      console.error(`  !! Failed to compress SKU ${sku.code}:`, err.message);
    }
  }

  console.log(`\n--- Migration Finished ---`);
  console.log(`Total SKUs updated: ${updatedCount}`);
  await prisma.$disconnect();
}

migrate();
