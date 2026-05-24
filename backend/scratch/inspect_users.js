require('dotenv').config();
const { getPrisma } = require('../src/config/prisma');
const prisma = getPrisma();

async function main() {
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name FROM nexus.tenants');
    for (const t of tenants) {
      const schema = t.db_name;
      try {
        const users = await prisma.$queryRawUnsafe(`SELECT id, email, name, role FROM "${schema}".users`);
        console.log(`\n================ Schema: ${schema} ================`);
        console.log(JSON.stringify(users, null, 2));
      } catch (err) {
        console.error(`Error querying users for schema ${schema}:`, err.message);
      }
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
