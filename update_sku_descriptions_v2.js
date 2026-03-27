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
  console.log('--- Updating SKU Descriptions (Robust) ---');
  
  const skus = await prisma.sku.findMany();
  let updatedCount = 0;

  for (const sku of skus) {
    let foundDescription = null;
    
    // Check for each mapping key
    for (const [key, character] of Object.entries(mapping)) {
      if (sku.name.toLowerCase().includes(key.toLowerCase())) {
        foundDescription = character;
        break; // Stop at first match
      }
    }

    if (foundDescription) {
      await prisma.sku.update({
        where: { id: sku.id },
        data: { description: foundDescription }
      });
      console.log(`[MATCH] "${sku.name}" -> "${foundDescription}"`);
      updatedCount++;
    }
  }

  console.log(`--- Finished. Updated ${updatedCount} SKUs. ---`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
