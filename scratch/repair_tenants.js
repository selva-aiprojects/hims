const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

async function repairTenants() {
  console.log("Repairing and Syncing Sample Tenants...");
  
  const tenants = [
    { name: "City Clinic", code: "city-clinic", plan: "Basic" },
    { name: "Metropolis Diagnostics", code: "metro-diag", plan: "Standard" },
    { name: "St. Marys Hospital", code: "st-marys", plan: "Professional" }
  ];

  for (const t of tenants) {
    const id = crypto.randomUUID();
    try {
      // Delete existing to avoid conflicts and ensure clean sync
      await prisma.$executeRawUnsafe(`DELETE FROM nexus.tenants WHERE name = '${t.name}' OR code = '${t.code}'`);
      
      // Insert with correct ID and required fields
      await prisma.$executeRawUnsafe(`
        INSERT INTO nexus.tenants (id, name, code, db_name, plan)
        VALUES ('${id}', '${t.name}', '${t.code}', 'hims_${t.code.replace(/-/g, '_')}', '${t.plan}')
      `);
      console.log(`- Synced: ${t.name}`);
    } catch (err) {
      console.error(`- Error syncing ${t.name}:`, err.message);
    }
  }
  
  await prisma.$disconnect();
}

repairTenants();
