require('dotenv').config();
const { getPrisma } = require('./backend/src/config/prisma');

async function inspect() {
  const prisma = getPrisma();
  try {
    const columns = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_schema = 'nexus' AND table_name = 'tenants'");
    console.log('Columns in nexus.tenants:', columns);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
