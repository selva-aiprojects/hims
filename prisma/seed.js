const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Nexus Superadmin...');
  
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@hmis-sys.com' },
    update: {
      passwordHash: 'Admin@123',
    },
    create: {
      email: 'admin@hmis-sys.com',
      passwordHash: 'Admin@123',
      role: 'nexus',
    },
  });

  console.log({ superadmin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
