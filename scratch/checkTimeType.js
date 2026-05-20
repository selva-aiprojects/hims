const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { prisma } = require("../backend/src/config/prisma");

async function check() {
  try {
    const schemas = await prisma.$queryRawUnsafe(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    `);
    console.log("SCHEMAS:", schemas);
    
    // Find first schema containing doctor_schedules table
    for (const s of schemas) {
      const schemaName = s.schema_name;
      try {
        const rows = await prisma.$queryRawUnsafe(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = '${schemaName}' AND table_name = 'doctor_schedules'
        `);
        if (rows.length > 0) {
          console.log(`Found doctor_schedules in schema: ${schemaName}`);
          const schedules = await prisma.$queryRawUnsafe(`
            SELECT start_time FROM "${schemaName}".doctor_schedules LIMIT 1
          `);
          console.log("SCHEDULE ROWS:", schedules);
          if (schedules.length > 0) {
            console.log("start_time type:", typeof schedules[0].start_time);
            console.log("start_time constructor:", schedules[0].start_time.constructor.name);
            console.log("start_time value:", schedules[0].start_time);
            return;
          }
        }
      } catch (e) {
        // Skip
      }
    }
  } catch (err) {
    console.error("ERROR running query:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
