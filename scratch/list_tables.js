require('dotenv').config();
const { Pool } = require('pg');

async function listTables(schema) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  // Clean URL for pg
  dbUrl.searchParams.delete('sslmode');
  
  const pool = new Pool({ 
    connectionString: dbUrl.toString(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schema]);
    
    console.log(`\n--- TABLE LIST FOR SCHEMA: ${schema} ---`);
    console.log(res.rows.map(r => r.table_name).join(', '));
    console.log(`\nTotal Tables Found: ${res.rows.length}`);
    console.log('------------------------------------------\n');
    
  } catch (err) {
    console.error('Error listing tables:', err.message);
  } finally {
    await pool.end();
  }
}

// Default to 'shpl' or use command line arg
const targetSchema = process.argv[2] || 'shpl';
listTables(targetSchema);
