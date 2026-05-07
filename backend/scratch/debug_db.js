const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schema = 'ahpl';
  try {
    console.log(`Checking tables in schema: ${schema}`);
    const tables = await prisma.$queryRawUnsafe(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = '${schema}'`);
    console.log('Tables:', JSON.stringify(tables, null, 2));

    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = '${schema}' AND table_name = 'doctor_availability'
    `);
    console.log('Columns for doctor_availability:', JSON.stringify(columns, null, 2));

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
