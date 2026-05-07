require('dotenv').config();
const { Pool } = require('pg');

async function checkDoctors() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });
  const schema = 'mhgcl';

  try {
    console.log(`\n--- Checking Doctors in Schema: ${schema} ---`);

    const res = await pool.query(`
      SELECT id, name, role, is_active, specialization, department 
      FROM "${schema}".users 
      WHERE role ILIKE 'doctor'
    `);
    
    console.log(`Found ${res.rows.length} doctors:`);
    res.rows.forEach(d => {
      console.log(`- ID: ${d.id}, Name: ${d.name}, Active: ${d.is_active}, Spec: ${d.specialization}`);
    });

  } catch (err) {
    console.error('❌ Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

checkDoctors();
