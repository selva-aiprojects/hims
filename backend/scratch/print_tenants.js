require('dotenv').config();
const { getPrisma } = require('../src/config/prisma');
const prisma = getPrisma();

async function main() {
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name, plan FROM nexus.tenants');
    console.log(JSON.stringify(tenants, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
