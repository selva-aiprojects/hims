require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const sqlPath = require('path').join(__dirname, '..', 'database', 'migrations', '20260520_add_patient_journey_indexes.sql');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env. Aborting.');
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to DB. Applying indexes...');
    await client.query('BEGIN');

    // Detect schemas that contain the target tables
    const targetTables = ['consultation_events','ipd_admissions','ipd_notes'];
    const res = await client.query(`
      SELECT DISTINCT table_schema FROM information_schema.tables
      WHERE table_name = ANY($1)
    `, [targetTables]);
    const schemas = res.rows.map(r => r.table_schema);
    if (schemas.length === 0) {
      console.warn('No target tables found in any schema. Aborting index creation.');
      await client.query('ROLLBACK');
      return;
    }

    for (const schema of schemas) {
      console.log('Applying indexes in schema:', schema);
      const cmds = [
        `CREATE INDEX IF NOT EXISTS idx_consultation_events_encounter_created_at ON "${schema}".consultation_events (encounter_id, created_at DESC)` ,
        `CREATE INDEX IF NOT EXISTS idx_ipd_admissions_admitted_at ON "${schema}".ipd_admissions (admitted_at DESC)` ,
        `CREATE INDEX IF NOT EXISTS idx_ipd_notes_admission_created_at ON "${schema}".ipd_notes (admission_id, created_at DESC)`
      ];
      for (const c of cmds) {
        try {
          console.log('Executing:', c.replace(/\s+/g,' ').slice(0,120));
          await client.query(c);
        } catch (e) {
          console.warn('Index command failed for schema', schema, e.message);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Indexes applied successfully.');
  } catch (err) {
    console.error('Error applying indexes:', err.message);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main();
