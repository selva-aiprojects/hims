const { Client } = require('pg');

const dbUrl = "postgresql://postgres.qnrypqwgxpmrlxanvbwq:hmis%4020-20-20@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  
  try {
    // Find all schemas
    const schemasRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name NOT IN ('public', 'information_schema', 'nexus') 
      AND schema_name NOT LIKE 'pg_%' 
      ORDER BY schema_name
    `);
    console.log('Tenant Schemas:', schemasRes.rows.map(r => r.schema_name));
    
    // Check wellness_basic schema patients
    const patientsRes = await client.query(`SELECT id, name, gender, created_at FROM wellness_basic.patients ORDER BY created_at DESC LIMIT 10`);
    console.log('\nPatients in wellness_basic:');
    patientsRes.rows.forEach(r => console.log(' -', r.name, '|', r.gender, '|', r.created_at?.toISOString?.()?.split('T')[0]));
    
    // Check today's appointments
    const apptRes = await client.query(`
      SELECT a.id, a.appointment_time, a.status, p.name as patient_name, u.name as doctor_name
      FROM wellness_basic.appointments a
      JOIN wellness_basic.patients p ON a.patient_id = p.id
      LEFT JOIN wellness_basic.users u ON a.doctor_id = u.id
      WHERE a.appointment_time::date = CURRENT_DATE
      ORDER BY a.appointment_time ASC
    `);
    console.log('\nToday\'s Appointments in wellness_basic:');
    if (apptRes.rows.length === 0) {
      console.log('  NO APPOINTMENTS TODAY');
    } else {
      apptRes.rows.forEach(r => console.log(' -', r.patient_name, '|', r.status, '|', r.appointment_time?.toISOString?.()?.substring(0, 16)));
    }
    
    // Check all appointments (not just today)
    const allApptRes = await client.query(`
      SELECT a.id, a.appointment_time, a.status, p.name as patient_name
      FROM wellness_basic.appointments a
      JOIN wellness_basic.patients p ON a.patient_id = p.id
      ORDER BY a.appointment_time DESC
      LIMIT 10
    `);
    console.log('\nAll recent Appointments in wellness_basic (last 10):');
    allApptRes.rows.forEach(r => console.log(' -', r.patient_name, '|', r.status, '|', r.appointment_time?.toISOString?.()?.substring(0, 16)));
    
    // Check gender stats
    const genderRes = await client.query(`SELECT gender, COUNT(*)::int as count FROM wellness_basic.patients GROUP BY gender`);
    console.log('\nGender stats:', genderRes.rows);
    
    // Check top complaints
    const complaintsRes = await client.query(`SELECT complaint as name, COUNT(*)::int as count FROM wellness_basic.complaints GROUP BY complaint ORDER BY count DESC LIMIT 5`);
    console.log('\nTop complaints:', complaintsRes.rows);
    
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
