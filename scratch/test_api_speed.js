const path = require('path');
require('dotenv').config({ path: 'd:/Training/working/HIMS/.env' });
const { getPrisma } = require('d:/Training/working/HIMS/backend/src/config/prisma.js');

async function main() {
  const prisma = getPrisma();
  console.log("Connected to Prisma.");

  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name FROM nexus.tenants');
    for (const tenant of tenants) {
      const tenantSchema = tenant.db_name;
      console.log(`\n--- Schema: ${tenantSchema} ---`);
      
      const tables = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${tenantSchema}'
      `);
      console.log("Tables:", tables.map(t => t.table_name).join(', '));
      
      // Let's check if doctors table exists
      if (tables.some(t => t.table_name === 'doctors')) {
        const docCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${tenantSchema}".doctors`);
        console.log(`Doctors count: ${docCount[0].count}`);
        
        if (docCount[0].count > 0) {
          const firstDoc = await prisma.$queryRawUnsafe(`SELECT id, name FROM "${tenantSchema}".doctors LIMIT 1`);
          const doctorId = firstDoc[0].id;
          console.log(`Found Doctor: ${firstDoc[0].name} (ID: ${doctorId})`);
          
          // Test the query speeds
          let start = Date.now();
          await prisma.$queryRawUnsafe(`SELECT * FROM "${tenantSchema}".doctor_schedules WHERE doctor_id = '${doctorId}'`);
          console.log(`Schedules query: ${Date.now() - start} ms`);

          start = Date.now();
          await prisma.$queryRawUnsafe(`SELECT * FROM "${tenantSchema}".appointments WHERE doctor_id = '${doctorId}'`);
          console.log(`Appointments query: ${Date.now() - start} ms`);

          start = Date.now();
          await prisma.$queryRawUnsafe(`
            SELECT 
              (SELECT COUNT(*)::integer FROM "${tenantSchema}".prescriptions WHERE encounter_id IN (SELECT id FROM "${tenantSchema}".encounters WHERE doctor_id = '${doctorId}')) as prescriptions_count,
              (SELECT COUNT(*)::integer FROM "${tenantSchema}".lab_orders WHERE encounter_id IN (SELECT id FROM "${tenantSchema}".encounters WHERE doctor_id = '${doctorId}')) as lab_orders_count,
              (SELECT COUNT(*)::integer FROM "${tenantSchema}".appointments WHERE doctor_id = '${doctorId}' AND status = 'Completed') as completed_appointments,
              (SELECT COALESCE(SUM(unit_price), 0)::float FROM "${tenantSchema}".billing_queue WHERE source_id = '${doctorId}') as revenue
          `);
          console.log(`Stats query (subqueries): ${Date.now() - start} ms`);
        }
      }
    }
  } catch (err) {
    console.error("Error running explorer:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
