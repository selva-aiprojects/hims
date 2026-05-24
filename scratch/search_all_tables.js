require('dotenv').config({ path: __dirname + '/../.env' });
const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function searchAllTables() {
  try {
    const schemasRes = await prisma.$queryRawUnsafe(`
      SELECT schema_name 
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    `);
    const schemas = schemasRes.map(s => s.schema_name);

    for (const schema of schemas) {
      try {
        const tablesRes = await prisma.$queryRawUnsafe(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE'
        `);
        for (const t of tablesRes) {
          const tableName = t.table_name;
          try {
            const colsRes = await prisma.$queryRawUnsafe(`
              SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_schema = '${schema}' AND table_name = '${tableName}'
              AND data_type IN ('character varying', 'text', 'character')
            `);
            if (colsRes.length === 0) continue;
            
            const whereClause = colsRes.map(c => `"${c.column_name}" ILIKE '%Ramesh%'`).join(' OR ');
            const query = `SELECT * FROM "${schema}"."${tableName}" WHERE ${whereClause} LIMIT 5`;
            const results = await prisma.$queryRawUnsafe(query);
            if (results.length > 0) {
              console.log(`FOUND in "${schema}"."${tableName}":`, results);
            }
          } catch (e) {
            // Ignore error
          }
        }
      } catch (e) {
        // Ignore error
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
searchAllTables();
