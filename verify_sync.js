
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const check = await prisma.sku.findFirst({
    where: {
      store: { name: 'mall-taman-anggrek' },
      imageUrl: { not: null, not: "" }
    }
  });
  console.log('Verification Result:', check ? 'SUCCESS - Images found in Mall Taman Anggrek' : 'FAILURE - Still no images');
}
main().finally(() => prisma.$disconnect());
