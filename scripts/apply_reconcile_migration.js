require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const sqlPath = require('path').join(__dirname, '..', 'database', 'migrations', '20260520_reconcile_tenants.sql');
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
    const targetSchemas = [];
    for (const s of schemas) {
      // filter to schemas that appear to be tenant (have patients table)
      const r = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'patients' LIMIT 1`, [s]);
      if (r.rowCount > 0) targetSchemas.push(s);
    }
    if (!targetSchemas.length) {
      console.warn('No tenant schemas found. Exiting.');
      return;
    }

    for (const schema of targetSchemas) {
      console.log('Reconciling schema:', schema);
      const sql = sqlTemplate.replace(/\{schema\}/g, schema);
      try {
        console.log('-> executing migration for schema as single multi-statement query');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (e) {
        console.warn('Migration failed for schema', schema, e.message);
        try { await client.query('ROLLBACK'); } catch (er) {}
      }
    }
    console.log('Reconcile migration completed.');
  } catch (err) {
    console.error('Error applying reconcile migration:', err.message);
  } finally {
    await client.end();
  }
}

main();
