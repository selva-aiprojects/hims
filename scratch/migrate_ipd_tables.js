/**
 * IPD Migration Script
 * 
 * Creates beds, ipd_admissions, and ipd_notes tables 
 * in ALL existing tenant schemas found in the nexus registry.
 * 
 * Run: node scratch/migrate_ipd_tables.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = new URL(process.env.DATABASE_URL);
dbUrl.searchParams.delete('sslmode');

const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl: { rejectUnauthorized: false }
});

const IPD_MIGRATION_SQL = (schema) => `
-- ================= IPD MIGRATION for schema: ${schema} =================

CREATE TABLE IF NOT EXISTS "${schema}".beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID REFERENCES "${schema}".wards(id),
  bed_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Vacant',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema}".ipd_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES "${schema}".patients(id),
  bed_id UUID REFERENCES "${schema}".beds(id),
  ward_id UUID REFERENCES "${schema}".wards(id),
  encounter_id UUID REFERENCES "${schema}".encounters(id),
  admitting_doctor_id UUID REFERENCES "${schema}".users(id),
  admission_reason TEXT,
  daily_charge NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  admitted_at TIMESTAMP DEFAULT NOW(),
  discharged_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "${schema}".ipd_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES "${schema}".ipd_admissions(id),
  doctor_id UUID REFERENCES "${schema}".users(id),
  note_text TEXT,
  note_type VARCHAR(50) DEFAULT 'Progress',
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function run() {
  const client = await pool.connect();
  
  try {
    console.log('\n[MIGRATE] Connecting to database...');

    // 1. Find all tenant schemas from nexus registry
    const tenantsResult = await client.query(
      `SELECT db_name FROM nexus.tenants WHERE db_name IS NOT NULL`
    );
    
    const schemas = tenantsResult.rows.map(r => r.db_name);
    console.log(`[MIGRATE] Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}\n`);

    // 2. Apply migration to each schema
    for (const schema of schemas) {
      try {
        console.log(`[MIGRATE] Applying IPD tables to schema: "${schema}"...`);
        await client.query(IPD_MIGRATION_SQL(schema));
        console.log(`[MIGRATE] ✅ Schema "${schema}" — IPD tables created/verified.\n`);
      } catch (err) {
        console.error(`[MIGRATE] ❌ Failed for schema "${schema}":`, err.message);
      }
    }

    console.log('[MIGRATE] Migration complete! Restart the backend server.');
  } catch (err) {
    console.error('[MIGRATE] Fatal error:', err.message);
    
    // Fallback: try to apply directly to mhgcl if nexus query fails
    if (err.message.includes('nexus')) {
      console.log('\n[MIGRATE] Falling back to direct schema migration for "mhgcl"...');
      try {
        await client.query(IPD_MIGRATION_SQL('mhgcl'));
        console.log('[MIGRATE] ✅ Applied directly to mhgcl schema.');
      } catch (e2) {
        console.error('[MIGRATE] Fallback also failed:', e2.message);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run();
