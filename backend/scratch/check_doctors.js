require('dotenv').config({path: '../.env'});
const { getPrisma } = require('./src/config/prisma');
const prisma = getPrisma();

async function checkDoctors() {
  try {
    const schemas = await prisma.$queryRawUnsafe(`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')`);
    
    for (const s of schemas) {
      const schemaName = s.schema_name;
      if (schemaName === 'nexus' || schemaName === 'public') continue;
      try {
        const users = await prisma.$queryRawUnsafe(`SELECT id, name, role, is_active FROM "${schemaName}".users WHERE role ILIKE 'doctor' OR role = 'DOCTOR'`);
        console.log(`Schema: ${schemaName}`);
        if (users.length > 0) {
            console.table(users);
        } else {
            console.log("No doctors found.");
        }
      } catch (e) {
        // Table might not exist in this schema
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkDoctors();
