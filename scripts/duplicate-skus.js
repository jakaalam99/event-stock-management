const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sourceStoreId = 'default-main-store';
  const targetStoreNames = ['mall-of-indonesia', 'mall-taman-anggrek'];

  console.log(`🚀 Starting SKU duplication from ${sourceStoreId}...`);

  // 1. Ensure target stores exist
  const targetStoreIds = [];
  for (const name of targetStoreNames) {
    const store = await prisma.store.upsert({
      where: { id: name }, // Using the name as ID for simplicity as requested/implied
      update: {},
      create: { id: name, name: name.replace(/-/g, ' ').toUpperCase() },
    });
    targetStoreIds.push(store.id);
    console.log(`✅ Store confirmed: ${store.name} (${store.id})`);
  }

  // 2. Fetch source SKUs
  const sourceSkus = await prisma.sku.findMany({
    where: { storeId: sourceStoreId },
  });

  console.log(`📦 Found ${sourceSkus.length} SKUs in source store.`);

  // 3. Duplicate for each target store
  let totalCreated = 0;
  for (const targetId of targetStoreIds) {
    console.log(`⚙️  Duplicating for ${targetId}...`);
    for (const sku of sourceSkus) {
      try {
        await prisma.sku.upsert({
          where: {
            code_storeId: {
              code: sku.code,
              storeId: targetId,
            },
          },
          update: {
            name: sku.name,
            description: sku.description,
            quantity: sku.quantity,
            srp: sku.srp,
            imageUrl: sku.imageUrl,
            lowStockThreshold: sku.lowStockThreshold,
          },
          create: {
            code: sku.code,
            name: sku.name,
            description: sku.description,
            quantity: sku.quantity,
            srp: sku.srp,
            imageUrl: sku.imageUrl,
            lowStockThreshold: sku.lowStockThreshold,
            storeId: targetId,
          },
        });
        totalCreated++;
      } catch (err) {
        console.error(`❌ Failed to duplicate SKU ${sku.code} to ${targetId}:`, err.message);
      }
    }
  }

  console.log(`✨ Duplication complete! Total records processed: ${totalCreated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
