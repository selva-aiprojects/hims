const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name, plan FROM nexus.tenants');
    console.log('--- NEXUS TENANTS ---');
    console.table(tenants);
    
    for (const t of tenants) {
      console.log(`\n--- SHARD: ${t.db_name} ---`);
      try {
        const userCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${t.db_name}".users`);
        const patientCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${t.db_name}".patients`);
        console.log(`Users: ${userCount[0].count}, Patients: ${patientCount[0].count}`);
      } catch (e) {
        console.log(`Failed to access shard ${t.db_name}: ${e.message}`);
      }
    }
  } catch (e) {
    console.error('Failed to query nexus.tenants:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
