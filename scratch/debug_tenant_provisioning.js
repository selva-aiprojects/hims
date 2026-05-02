const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function debugTenant() {
  try {
    // Get all tenants from registry
    const tenants = await prisma.$queryRawUnsafe(`SELECT id, name, db_name FROM nexus.tenants LIMIT 5`);
    console.log("Tenants in registry:");
    console.log(JSON.stringify(tenants, null, 2));

    if (tenants.length === 0) {
      console.log("No tenants found.");
      return;
    }

    // Check each tenant's schema
    for (const tenant of tenants) {
      const schemaName = tenant.db_name.toLowerCase();
      console.log(`\n--- Checking Tenant: ${tenant.name} | Schema: ${schemaName} ---`);

      try {
        // Check if schema exists
        const schemaExists = await prisma.$queryRawUnsafe(`
          SELECT EXISTS(
            SELECT FROM information_schema.schemata WHERE schema_name = '${schemaName}'
          ) as exists
        `);
        console.log(`Schema exists: ${schemaExists[0].exists}`);

        if (schemaExists[0].exists) {
          // Count tables
          const tableCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = '${schemaName}' AND table_type = 'BASE TABLE'
          `);
          console.log(`Tables in schema: ${tableCount[0].count}`);

          // Count rows in key master tables
          const deptCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count FROM "${schemaName}".departments
          `);
          console.log(`Departments: ${deptCount[0].count}`);

          const diseaseCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count FROM "${schemaName}".diseases
          `);
          console.log(`Diseases: ${diseaseCount[0].count}`);

          const treatmentCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count FROM "${schemaName}".treatments
          `);
          console.log(`Treatments: ${treatmentCount[0].count}`);

          const serviceCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count FROM "${schemaName}".services
          `);
          console.log(`Services: ${serviceCount[0].count}`);

          const medicineCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count FROM "${schemaName}".medicines
          `);
          console.log(`Medicines: ${medicineCount[0].count}`);

          // If empty, try to manually insert one test row
          if (deptCount[0].count === 0) {
            console.log("Departments are empty. Attempting manual seed...");
            try {
              await prisma.$executeRawUnsafe(`
                INSERT INTO "${schemaName}".departments (name, description, hod, specialty) 
                VALUES ('Test Dept', 'Test', 'Dr. Test', 'Test')
                ON CONFLICT (name) DO NOTHING
              `);
              const testCount = await prisma.$queryRawUnsafe(`
                SELECT COUNT(*) as count FROM "${schemaName}".departments
              `);
              console.log(`After manual insert: ${testCount[0].count} departments`);
            } catch (insertErr) {
              console.error(`Manual insert failed: ${insertErr.message}`);
            }
          }
        }
      } catch (err) {
        console.error(`Error checking tenant ${tenant.name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Fatal error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugTenant();
