const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTenants() {
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name FROM nexus.tenants');
    console.log(JSON.stringify(tenants, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

listTenants();
