const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Check if nexus schema exists
    try {
      const schemas = await prisma.$queryRawUnsafe(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'nexus'
      `);
      console.log('Nexus schema found:', schemas);
    } catch (err) {
      console.log('Error checking nexus schema:', err.message);
    }
    
    // Check all schemas
    try {
      const allSchemas = await prisma.$queryRawUnsafe(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `);
      console.log('All available schemas:', allSchemas);
    } catch (err) {
      console.log('Error checking all schemas:', err.message);
    }
    
    // Check if nexus.tenants exists
    try {
      const tables = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'nexus' AND table_name = 'tenants'
      `);
      console.log('Nexus tenants table:', tables);
    } catch (err) {
      console.log('Error checking nexus.tenants:', err.message);
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
