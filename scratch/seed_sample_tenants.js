const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedTenants() {
  console.log("Seeding Sample Tenants for each Tier...");
  
  const tenants = [
    {
      name: "City Clinic",
      code: "city-clinic",
      db_name: "hims_city_clinic",
      plan: "Basic",
      email: "admin@cityclinic.com"
    },
    {
      name: "Metropolis Diagnostics",
      code: "metro-diag",
      db_name: "hims_metro_diag",
      plan: "Standard",
      email: "admin@metrodiag.com"
    },
    {
      name: "St. Marys Hospital",
      code: "st-marys",
      db_name: "hims_st_marys",
      plan: "Professional",
      email: "admin@stmarys.com"
    }
  ];

  for (const t of tenants) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO nexus.tenants (name, code, db_name, plan, status)
        VALUES ('${t.name}', '${t.code}', '${t.db_name}', '${t.plan}', 'Active')
        ON CONFLICT (code) DO UPDATE SET plan = '${t.plan}';
      `);
      console.log(`- Seeded: ${t.name} (${t.plan})`);
    } catch (err) {
      console.error(`- Failed to seed ${t.name}:`, err.message);
    }
  }
  
  await prisma.$disconnect();
}

seedTenants();
