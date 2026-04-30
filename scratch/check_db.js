const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tenants = await prisma.tenant.findMany();
  console.log('Total Tenants:', tenants.length);
  console.log(tenants);
  
  const users = await prisma.user.findMany();
  console.log('Total Users:', users.length);
  console.log(users);
}

check().finally(() => prisma.$disconnect());
