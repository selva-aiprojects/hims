require('dotenv').config();
const { Pool } = require('pg');

async function checkLabSchema() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  try {
    const schema = 'ahpl';
    console.log(`\n--- Inspecting Lab Order Schema for ${schema} ---`);

    const colRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'lab_orders'
    `, [schema]);

    console.log("Columns in lab_orders:");
    colRes.rows.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`));

  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

checkLabSchema();
