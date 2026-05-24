const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("Connected to DB!");
  
  // Let's find the schema name first from a list of schemas or tenants
  const tenantRes = await client.query(`SELECT id, name, db_name FROM nexus.tenants LIMIT 10`);
  console.log("Tenants:", tenantRes.rows);
  
  for (const tenant of tenantRes.rows) {
    const schema = tenant.db_name.toLowerCase();
    try {
      console.log(`\n--- Checking schema ${schema} (${tenant.name}) ---`);
      
      const encountersRes = await client.query(`
        SELECT id, patient_id, doctor_id, status, vitals, created_at 
        FROM "${schema}".encounters 
        ORDER BY created_at DESC LIMIT 5
      `);
      console.log(`Last 5 encounters:`, encountersRes.rows);
      
      for (const enc of encountersRes.rows) {
        const patRes = await client.query(`SELECT name, mrn FROM "${schema}".patients WHERE id = '${enc.patient_id}'`);
        console.log(`Encounter ${enc.id} for Patient:`, patRes.rows[0]);
      }
    } catch (e) {
      console.log(`Error checking schema ${schema}:`, e.message);
    }
  }
  
  await client.end();
}

check().catch(console.error);
