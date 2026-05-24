const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const dbUrl = "postgresql://postgres.qnrypqwgxpmrlxanvbwq:hmis%4020-20-20@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    // Check wellness_hyd patients
    console.log('=== wellness_hyd patients ===');
    const patientsRes = await client.query(`SELECT id, name, gender, created_at FROM wellness_hyd.patients ORDER BY created_at DESC LIMIT 10`);
    patientsRes.rows.forEach(r => console.log(' -', r.name, '|', r.gender));
    
    // Check wellness_hyd appointments
    console.log('\n=== wellness_hyd today appointments ===');
    try {
      const apptRes = await client.query(`
        SELECT a.appointment_time, a.status, p.name as patient_name
        FROM wellness_hyd.appointments a
        JOIN wellness_hyd.patients p ON a.patient_id = p.id
        WHERE a.appointment_time::date = CURRENT_DATE
      `);
      if (apptRes.rows.length === 0) console.log('  (no appointments today)');
      apptRes.rows.forEach(r => console.log(' -', r.patient_name, '|', r.status, '|', r.appointment_time?.toISOString?.()?.substring(0, 16)));
    } catch(e) { console.log('  Error:', e.message); }
    
    // wellness_hyd encounters
    console.log('\n=== wellness_hyd encounters ===');
    try {
      const encRes = await client.query(`SELECT id, status, created_at FROM wellness_hyd.encounters ORDER BY created_at DESC LIMIT 5`);
      if (encRes.rows.length === 0) console.log('  (no encounters)');
      encRes.rows.forEach(r => console.log(' -', r.id?.substring(0, 8), '|', r.status, '|', r.created_at?.toISOString?.()?.substring(0, 16)));
    } catch(e) { console.log('  Error:', e.message); }
    
    // wellness_hyd gender stats
    console.log('\n=== wellness_hyd gender stats ===');
    try {
      const genderRes = await client.query(`SELECT gender, COUNT(*)::int as count FROM wellness_hyd.patients GROUP BY gender`);
      genderRes.rows.forEach(r => console.log(' -', r.gender, ':', r.count));
    } catch(e) { console.log('  Error:', e.message); }
    
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
