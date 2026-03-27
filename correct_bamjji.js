const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Updating SKU Descriptions (Correction: Bamjji) ---');
  
  const skus = await prisma.sku.findMany({
    where: {
      name: { contains: 'bamjji', mode: 'insensitive' }
    }
  });

  let updatedCount = 0;
  for (const sku of skus) {
    await prisma.sku.update({
      where: { id: sku.id },
      data: { description: 'Jisung' }
    });
    console.log(`Updated SKU: ${sku.name} -> Description: Jisung`);
    updatedCount++;
  }

  console.log(`Done. Updated ${updatedCount} SKUs.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
