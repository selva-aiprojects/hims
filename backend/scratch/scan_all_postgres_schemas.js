require('dotenv').config();
const { getPrisma } = require('../src/config/prisma');
const prisma = getPrisma();

async function main() {
  try {
    // 1. Get all schemas
    const schemasRes = await prisma.$queryRawUnsafe(`
      SELECT schema_name 
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    `);
    const schemas = schemasRes.map(s => s.schema_name);
    console.log('Schemas:', schemas);

    for (const schema of schemas) {
      try {
        // Check if patients table exists in this schema
        const tableCheck = await prisma.$queryRawUnsafe(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = '${schema}' AND table_name = 'patients'
        `);
        if (tableCheck.length === 0) continue;

        const patients = await prisma.$queryRawUnsafe(`
          SELECT name FROM "${schema}".patients WHERE name ILIKE '%Ramesh%' OR name ILIKE '%Priya%'
        `);
        if (patients.length > 0) {
          console.log(`FOUND in schema "${schema}":`, patients);
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
main();
