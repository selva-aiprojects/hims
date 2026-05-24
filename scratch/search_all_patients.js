require('dotenv').config({ path: __dirname + '/../.env' });
const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function searchAllPatients() {
  try {
    const schemasRes = await prisma.$queryRawUnsafe(`
      SELECT schema_name 
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    `);
    const schemas = schemasRes.map(s => s.schema_name);

    for (const schema of schemas) {
      try {
        const tableCheck = await prisma.$queryRawUnsafe(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = '${schema}' AND table_name = 'patients'
        `);
        if (tableCheck.length === 0) continue;

        const patients = await prisma.$queryRawUnsafe(`
          SELECT name FROM "${schema}".patients
        `);
        if (patients.length > 0) {
          console.log(`Schema "${schema}" has patients:`, patients.map(p => p.name));
        }
      } catch (e) {
        // Skip errors
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
searchAllPatients();
