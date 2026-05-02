require('dotenv').config();
const { Pool } = require('pg');

async function findTenant(name) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  
  const pool = new Pool({ 
    connectionString: dbUrl.toString(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT name, db_name, code 
      FROM nexus.tenants 
      WHERE name ILIKE $1
    `, [`%${name}%`]);
    
    if (res.rows.length === 0) {
      console.log(`No tenant found matching: ${name}`);
      return;
    }

    console.log('\n--- TENANT DETAILS ---');
    console.table(res.rows);
    
  } catch (err) {
    console.error('Error finding tenant:', err.message);
  } finally {
    await pool.end();
  }
}

findTenant('New Age hospital');
