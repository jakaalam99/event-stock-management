const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.update({
    where: { id: 'user_admin' },
    data: { role: 'ADMIN' }
  });
  console.log('Updated user role to ADMIN:', result.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
