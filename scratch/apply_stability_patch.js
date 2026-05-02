require('dotenv').config();
const { prisma } = require("../backend/src/config/prisma");

async function applyFixes() {
  console.log("🛠️ Applying Stability Patch to all shards...");
  
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT name, db_name FROM nexus.tenants`);
    
    for (const tenant of tenants) {
      const s = tenant.db_name;
      console.log(`\n--- Patching Shard: ${tenant.name} (${s}) ---`);
      
      try {
        // 1. Create wards table if missing
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${s}".wards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100),
            capacity INTEGER DEFAULT 10,
            type VARCHAR(50) DEFAULT 'General',
            floor VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);

        // 2. Add missing columns to medicines
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "${s}".medicines ADD COLUMN stock_quantity INTEGER DEFAULT 100`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "${s}".medicines ADD COLUMN unit_price NUMERIC DEFAULT 0`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "${s}".medicines ADD COLUMN expiry_date DATE DEFAULT (NOW() + INTERVAL '1 year')`);
          console.log(`  ✅ Added inventory columns to medicines.`);
        } catch (e) {
          console.log(`  ℹ️ Inventory columns might already exist.`);
        }

        // 3. Seed wards if empty
        const wardCount = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "${s}".wards`);
        if (Number(wardCount[0].count) === 0) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${s}".wards (name, capacity, floor, type) VALUES
            ('General Ward - Male', 20, '1st Floor', 'General'),
            ('General Ward - Female', 20, '1st Floor', 'General'),
            ('ICU - Unit A', 8, '2nd Floor', 'Critical Care'),
            ('Private Deluxe', 10, '3rd Floor', 'Premium')
          `);
          console.log(`  ✅ Seeded default wards.`);
        }

        // 4. Update Billing Tables
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${s}".invoices 
          ADD COLUMN IF NOT EXISTS bill_type VARCHAR(50),
          ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50),
          ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
          ADD COLUMN IF NOT EXISTS tax_total NUMERIC DEFAULT 0,
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
        `);
        
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${s}".invoice_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID REFERENCES "${s}".invoices(id),
            description VARCHAR(255),
            quantity INTEGER DEFAULT 1,
            unit_price NUMERIC DEFAULT 0,
            tax_percent NUMERIC DEFAULT 0,
            amount NUMERIC DEFAULT 0
          )
        `);
        console.log(`  ✅ Billing tables upgraded.`);

        console.log(`✅ Shard ${s} patched successfully.`);
      } catch (err) {
        console.error(`❌ Error patching shard ${s}:`, err.message);
      }
    }
    console.log("\n✨ Patching Complete!");
  } catch (err) {
    console.error("💥 Patching failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

applyFixes();
