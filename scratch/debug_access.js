require('dotenv').config();
const { prisma } = require("./backend/src/config/prisma");

async function checkData() {
  try {
    console.log("--- Nexus Tenants ---");
    const tenants = await prisma.$queryRawUnsafe(`SELECT id, name, code, db_name FROM nexus.tenants`);
    console.table(tenants);

    for (const t of tenants) {
      console.log(`\n--- Users in Shard: ${t.db_name} (${t.name}) ---`);
      try {
        const users = await prisma.$queryRawUnsafe(`SELECT id, name, email, role FROM "${t.db_name}".users`);
        console.table(users);
      } catch (e) {
        console.log(`  Error fetching users for ${t.db_name}: ${e.message}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
