require("dotenv/config");
const { prisma } = require("../src/config/prisma");

async function updateLabSchema() {
  try {
    console.log("--- Updating Lab Schema across Shards ---");
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);

    for (const t of tenants) {
      const schema = t.db_name;
      console.log(`[SHARD] Updating ${schema}...`);
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".lab_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal'`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".lab_results ADD COLUMN IF NOT EXISTS technician_id UUID`);
        console.log(`[SHARD] ${schema} updated.`);
      } catch (err) {
        console.error(`[SHARD] Failed ${schema}:`, err.message);
      }
    }
    console.log("--- Done ---");
  } catch (err) {
    console.error("--- Failed ---", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateLabSchema();
