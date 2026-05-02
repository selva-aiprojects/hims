const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTables(schema) {
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${schema}'
    `);
    console.log(`Tables in ${schema}:`, tables.map(t => t.table_name));
    console.log(`Count: ${tables.length}`);
  } catch (err) {
    console.error('Error listing tables:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Assuming the last created tenant was 'shpl' based on previous screenshots
listTables('shpl');
