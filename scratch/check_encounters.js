const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const dbUrl = "postgresql://postgres.qnrypqwgxpmrlxanvbwq:hmis%4020-20-20@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    // Check encounters table columns
    const colsRes = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='wellness_basic' AND table_name='encounters' ORDER BY ordinal_position`);
    console.log('wellness_basic.encounters columns:');
    colsRes.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type));
    
    // List all encounters
    const enc = await client.query(`SELECT id, patient_id, doctor_id, status, type, created_at FROM wellness_basic.encounters ORDER BY created_at DESC LIMIT 10`);
    console.log('\nAll encounters (latest 10):');
    enc.rows.forEach(r => console.log(' -', r.id?.substring(0, 8), '|', r.status, '|', r.type, '|', r.created_at?.toISOString?.()?.substring(0, 16)));
    
    // Check if there's a token_number or similar column
    const hasToken = colsRes.rows.find(r => r.column_name.includes('token'));
    if (!hasToken) {
      console.log('\nNO token column in encounters table!');
    }
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
