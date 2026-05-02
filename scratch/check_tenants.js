require('dotenv').config();
const { Pool } = require('pg');

async function checkTenants() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  try {
    const res = await pool.query('SELECT id, name, code, db_name FROM nexus.tenants');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkTenants();
