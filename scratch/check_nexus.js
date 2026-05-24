const { Client } = require('pg');

const dbUrl = "postgresql://postgres.qnrypqwgxpmrlxanvbwq:hmis%4020-20-20@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  
  try {
    // Check nexus tenants columns first
    const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='nexus' AND table_name='tenants' ORDER BY ordinal_position`);
    console.log('Nexus tenants columns:', colsRes.rows.map(r => r.column_name));
    
    const tenantsRes = await client.query(`SELECT * FROM nexus.tenants ORDER BY created_at DESC LIMIT 10`);
    console.log('\nNexus tenants:');
    tenantsRes.rows.forEach(r => console.log(' ', JSON.stringify(r)));
    
    // Users columns
    const uColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='nexus' AND table_name='users' ORDER BY ordinal_position`);
    console.log('\nNexus users columns:', uColsRes.rows.map(r => r.column_name));
    
    const usersRes = await client.query(`SELECT * FROM nexus.users WHERE email = 'admin@wellness.com' LIMIT 5`);
    console.log('\nUsers (admin@wellness.com):');
    usersRes.rows.forEach(r => console.log(' ', JSON.stringify(r)));
    
    // Check wellness_basic schema users
    const wbUColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='wellness_basic' AND table_name='users' ORDER BY ordinal_position`);
    console.log('\nwellness_basic.users columns:', wbUColsRes.rows.map(r => r.column_name));
    
    const wbUsersRes = await client.query(`SELECT id, name, email, role FROM wellness_basic.users LIMIT 10`);
    console.log('\nwellness_basic users:');
    wbUsersRes.rows.forEach(r => console.log(' -', r.name, '|', r.email, '|', r.role));
    
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
