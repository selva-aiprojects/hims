require('dotenv').config({ path: __dirname + '/../.env' });
const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function findTenant() {
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT * FROM nexus.tenants`);
    console.log('Tenants:', tenants);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
findTenant();
