require('dotenv').config({ path: __dirname + '/../.env' });
const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function listSchemas() {
  try {
    const allSchemas = await prisma.$queryRawUnsafe(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log('All available schemas:', allSchemas.map(s => s.schema_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

listSchemas();
