require("dotenv/config");
const { prisma } = require("../src/config/prisma");

async function healDatabase() {
  try {
    console.log("--- Starting Global Database Healing ---");
    
    // 1. Ensure Nexus registry is healed
    console.log("[NEXUS] Healing registry...");
    await prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS ui_settings JSONB DEFAULT '{}'::jsonb`);
    await prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255)`);
    
    // 2. Get all tenant schemas
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);
    console.log(`[NEXUS] Found ${tenants.length} tenants to heal.`);

    for (const t of tenants) {
      const schema = t.db_name;
      console.log(`[SHARD] Healing schema: ${schema}...`);
      try {
        // Fix Patients table (ai_summary)
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS ai_summary TEXT`);
        
        // Fix Users table (Staff)
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS age INTEGER`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS qualifications TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS experience_years INTEGER`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);
        
        console.log(`[SHARD] ${schema} healed successfully.`);
      } catch (shardErr) {
        console.error(`[SHARD] Failed to heal ${schema}:`, shardErr.message);
      }
    }
    
    console.log("--- Healing Complete ---");
  } catch (err) {
    console.error("--- Global Healing Failed ---", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

healDatabase();
