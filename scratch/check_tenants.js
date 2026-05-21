const { Client } = require('pg');

const dbUrl = "postgresql://postgres.qnrypqwgxpmrlxanvbwq:hmis%4020-20-20@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  
  try {
    // Check all wellness schemas for appointments named Ramesh Kumar
    const schemas = ['wellness_basic', 'wellness_hyd', 'wellness_prof', 'wellness_standard', 'wellnessdiag_hyd', 'wellnessnurse_hyd'];
    
    for (const schema of schemas) {
      try {
        const res = await client.query(`
          SELECT a.appointment_time, a.status, p.name as patient_name, u.name as doctor_name
          FROM "${schema}".appointments a
          JOIN "${schema}".patients p ON a.patient_id = p.id
          LEFT JOIN "${schema}".users u ON a.doctor_id = u.id
          ORDER BY a.appointment_time DESC
          LIMIT 8
        `);
        console.log(`\n=== ${schema} appointments ===`);
        if (res.rows.length === 0) {
          console.log('  (no appointments)');
        } else {
          res.rows.forEach(r => console.log(' -', r.patient_name, '|', r.doctor_name, '|', r.status, '|', r.appointment_time?.toISOString?.()?.substring(0, 16)));
        }
      } catch(e) {
        console.log(`  ${schema}: ERROR - ${e.message.split('\n')[0]}`);
      }
    }

    // Also check users/admin login in nexus schema
    console.log('\n=== Nexus users (tenants) ===');
    const usersRes = await client.query(`SELECT email, tenant_id FROM nexus.users WHERE email LIKE '%wellness%' OR email LIKE '%admin%' ORDER BY email LIMIT 10`);
    usersRes.rows.forEach(r => console.log(' -', r.email, '| tenant_id:', r.tenant_id));
    
    // Check tenant table
    console.log('\n=== Nexus tenants ===');
    const tenantsRes = await client.query(`SELECT id, name, schema_name, plan FROM nexus.tenants ORDER BY created_at DESC LIMIT 10`);
    tenantsRes.rows.forEach(r => console.log(' -', r.name, '| schema:', r.schema_name, '| plan:', r.plan));
    
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
