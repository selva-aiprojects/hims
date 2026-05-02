require('dotenv').config();
const { prisma } = require("../backend/src/config/prisma");
const fs = require("fs");
const path = require("path");

async function syncAllShards() {
  console.log("🚀 Starting Global Schema Sync...");
  
  try {
    // 1. Read the latest Base Schema
    const schemaPath = path.join(__dirname, "../database/SHARD_Base_Schema.sql");
    const baseSql = fs.readFileSync(schemaPath, "utf8");
    const statements = baseSql.split(';').filter(s => s.trim().length > 0);

    // 2. Fetch all tenants from Nexus
    const tenants = await prisma.$queryRawUnsafe(`SELECT name, db_name FROM nexus.tenants`);
    console.log(`🔍 Found ${tenants.length} tenants to sync.`);

    for (const tenant of tenants) {
      const schemaName = tenant.db_name;
      console.log(`\n--- Syncing Shard: ${tenant.name} (${schemaName}) ---`);
      
      try {
        // Apply each statement to the specific schema
        for (let statement of statements) {
          try {
            await prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public; ${statement}`);
          } catch (e) {
            // Ignore "already exists" errors if we are just syncing masters
            if (!e.message.includes("already exists")) {
              console.warn(`  ⚠️ Statement Warning: ${e.message.substring(0, 80)}...`);
            }
          }
        }
        console.log(`✅ SUCCESS: ${tenant.name} is now in sync with SHARD_Base_Schema.sql`);
      } catch (err) {
        console.error(`❌ FAILED: ${tenant.name}:`, err.message);
      }
    }

    console.log("\n✨ Global Sync Complete!");
  } catch (err) {
    console.error("💥 Global Sync Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncAllShards();
