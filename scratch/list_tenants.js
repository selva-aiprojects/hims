const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT id, name, db_name FROM nexus.tenants');
    console.log('Available Tenants:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying tenants:', err);
  } finally {
    await pool.end();
  }
}

run();
