require("dotenv/config");
const { prisma } = require("../src/config/prisma");

async function patchLabBilling() {
  try {
    console.log("--- Patching Lab Billing Linkage ---");
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);

    for (const t of tenants) {
      const schema = t.db_name;
      console.log(`[SHARD] Patching ${schema}...`);
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".lab_orders ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES "${schema}".invoices(id)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".lab_orders ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT FALSE`);
        console.log(`[SHARD] ${schema} patched.`);
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

patchLabBilling();
