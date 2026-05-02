require('dotenv').config();
const { Pool } = require('pg');

async function verifyData() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  try {
    const schemas = ['mhgcl', 'shpl', 'nahpl'];
    for (const s of schemas) {
      const res = await pool.query(`SELECT count(*) FROM "${s}".treatments`);
      console.log(`Schema [${s}] Treatments Count: ${res.rows[0].count}`);
    }
  } catch (err) {
    console.error("Verification failed:", err.message);
  } finally {
    await pool.end();
  }
}

verifyData();
