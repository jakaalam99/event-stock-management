const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('eventstock2024', 10);
  const email = 'admin@eventstock.com';

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: {
      email,
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      storeId: 'default-main-store'
    }
  });

  console.log(`Success: Reset password for ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
