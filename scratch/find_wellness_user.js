require('dotenv').config({ path: __dirname + '/../.env' });
const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function findUser() {
  try {
    // Check in nexus.users
    const nexusUsers = await prisma.$queryRawUnsafe(`
      SELECT id, email, password, role, "tenantId" FROM nexus.users WHERE email = 'admin@wellness.com'
    `);
    console.log('Nexus Users:', nexusUsers);

    // Let's also check in other schemas if users table exists there
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
          WHERE table_schema = '${schema}' AND table_name = 'users'
        `);
        if (tableCheck.length === 0) continue;

        const users = await prisma.$queryRawUnsafe(`
          SELECT id, email, password, role FROM "${schema}".users WHERE email = 'admin@wellness.com'
        `);
        if (users.length > 0) {
          console.log(`Schema "${schema}" has user admin@wellness.com:`, users);
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
findUser();
