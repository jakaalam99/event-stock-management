
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Renaming Store ---');
  
  // Find "Main Store"
  const store = await prisma.store.findFirst({
    where: { name: 'Main Store' }
  });

  if (store) {
    await prisma.store.update({
      where: { id: store.id },
      data: { name: 'Central Grand Indonesia' }
    });
    console.log(`Success: Renamed store ID ${store.id} to "Central Grand Indonesia"`);
  } else {
    // If not found by "Main Store", try "main-default-store"
    const store2 = await prisma.store.findFirst({
      where: { name: 'main-default-store' }
    });
    if (store2) {
      await prisma.store.update({
        where: { id: store2.id },
        data: { name: 'Central Grand Indonesia' }
      });
      console.log(`Success: Renamed store ID ${store2.id} to "Central Grand Indonesia"`);
    } else {
      console.log('Error: Could not find Store with name "Main Store" or "main-default-store"');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
