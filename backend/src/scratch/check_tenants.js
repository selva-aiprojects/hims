const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenants() {
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name FROM nexus.tenants');
    console.log('TENANTS:', JSON.stringify(tenants, null, 2));
    
    for (const t of tenants) {
      const users = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${t.db_name}".users`);
      console.log(`Schema ${t.db_name} has ${users[0].count} users.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();
