require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = new URL(process.env.DATABASE_URL);
dbUrl.searchParams.delete('sslmode');

const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const tenantsResult = await client.query(
      `SELECT db_name FROM nexus.tenants WHERE db_name IS NOT NULL`
    );
    const schemas = tenantsResult.rows.map(r => r.db_name);
    
    for (const schema of schemas) {
      console.log(`[MIGRATE] Adding ai_summary to "${schema}".patients...`);
      try {
        await client.query(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS ai_summary TEXT;`);
        console.log(`[MIGRATE] ✅ Success for schema "${schema}".`);
      } catch (err) {
        console.error(`[MIGRATE] ❌ Failed for schema "${schema}":`, err.message);
      }
    }
  } catch (err) {
    console.error('[MIGRATE] Fatal error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
