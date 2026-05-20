require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const sqlPath = require('path').join(__dirname, '..', 'database', 'migrations', '20260520_indexes_ci.sql');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env. Aborting.');
    process.exit(1);
  }
  const sqlTemplate = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to DB. Discovering tenant schemas...');
    const res = await client.query(`SELECT DISTINCT table_schema FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')`);
    const schemas = res.rows.map(r => r.table_schema).filter(s => s !== 'public');
    // Better: detect schemas that contain encounters table
    const targetSchemas = [];
    for (const s of schemas) {
      const r = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'encounters' LIMIT 1`, [s]);
      if (r.rowCount > 0) targetSchemas.push(s);
    }
    if (!targetSchemas.length) {
      console.warn('No tenant schemas with target tables found. Exiting.');
      return;
    }

    for (const schema of targetSchemas) {
      console.log('Applying migration to schema:', schema);
      const sql = sqlTemplate.replace(/\{schema\}/g, schema);
      const stmts = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
      try {
        await client.query('BEGIN');
        for (const stmt of stmts) {
          try {
            console.log('->', stmt.split('\n')[0].slice(0,160));
            await client.query(stmt);
          } catch (e) {
            console.warn('Statement failed for schema', schema, e.message);
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        console.warn('Migration failed for schema', schema, e.message);
        try { await client.query('ROLLBACK'); } catch (er) {}
      }
    }
    console.log('CI migration applied.');
  } catch (err) {
    console.error('Error applying CI migration:', err.message);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main();
