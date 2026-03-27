const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapping = {
  'Eong': 'Mark Lee',
  'Jjun': 'Renjun',
  'Jjed': 'Jeno',
  'Jjopoo': 'Haechan',
  'Kkyuping': 'Jaemin',
  'Lemyo': 'Chenle',
  'Bamji': 'Jisung'
};

async function main() {
  console.log('--- Updating SKU Descriptions ---');
  
  const skus = await prisma.sku.findMany();
  let updatedCount = 0;

  for (const sku of skus) {
    // Check if the SKU name contains any of the keys (case insensitive)
    const matchedKey = Object.keys(mapping).find(key => 
      sku.name.toLowerCase().includes(key.toLowerCase())
    );

    if (matchedKey) {
      const description = mapping[matchedKey];
      await prisma.sku.update({
        where: { id: sku.id },
        data: { description }
      });
      console.log(`Updated SKU: ${sku.name} -> Description: ${description}`);
      updatedCount++;
    }
  }

  console.log(`Done. Updated ${updatedCount} SKUs.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
