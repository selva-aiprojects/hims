const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/hims",
  ssl: { rejectUnauthorized: false }
});

async function debugDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Check all schemas
    const schemasResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log('Available schemas:', schemasResult.rows.map(r => r.schema_name));
    
    // Check if ahpl schema exists
    const ahplTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'ahpl'
      ORDER BY table_name
    `);
    console.log('Tables in ahpl schema:', ahplTables.rows.map(r => r.table_name));
    
    // Check users in ahpl schema
    const usersResult = await pool.query(`
      SELECT id, name, role, specialization, is_active 
      FROM ahpl.users 
      LIMIT 10
    `);
    console.log('Users in ahpl schema:', usersResult.rows);
    
    // Check specifically for doctors
    const doctorsResult = await pool.query(`
      SELECT id, name, role, specialization, is_active 
      FROM ahpl.users 
      WHERE role ILIKE '%doctor%' OR role = 'DOCTOR'
    `);
    console.log('Doctors in ahpl schema:', doctorsResult.rows);
    console.log('Number of doctors:', doctorsResult.rows.length);
    
    await pool.end();
  } catch (error) {
    console.error('Database debug error:', error.message);
    await pool.end();
  }
}

debugDatabase();
