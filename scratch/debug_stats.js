process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugStats() {
  const schema = 'mhgcl';
  const today = new Date().toISOString().split('T')[0];
  console.log(`Debug Today: ${today}`);

  try {
    const patients = await pool.query(`SELECT count(*) FROM "${schema}".patients`);
    console.log(`Total Patients: ${patients.rows[0].count}`);

    const todayPatients = await pool.query(`SELECT count(*) FROM "${schema}".patients WHERE created_at::date = $1`, [today]);
    console.log(`Today Patients: ${todayPatients.rows[0].count}`);

    const sample = await pool.query(`SELECT created_at FROM "${schema}".patients LIMIT 1`);
    if (sample.rows.length > 0) {
      console.log(`Sample created_at: ${sample.rows[0].created_at} (Type: ${typeof sample.rows[0].created_at})`);
    }

    const invoices = await pool.query(`SELECT count(*) FROM "${schema}".invoices`);
    console.log(`Total Invoices: ${invoices.rows[0].count}`);

    const weekly = await pool.query(`
      SELECT created_at::date as date, COUNT(*) as count 
      FROM "${schema}".patients 
      GROUP BY created_at::date
    `);
    console.log(`Weekly Data:`, weekly.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

debugStats();
