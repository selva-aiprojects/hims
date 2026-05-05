require('dotenv').config();
const { Pool } = require('pg');

async function listTenants() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  try {
    const res = await pool.query("SELECT id, name, db_name, plan FROM nexus.tenants ORDER BY name");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Failed to list tenants:', err.message);
  } finally {
    await pool.end();
  }
}

listTenants();
