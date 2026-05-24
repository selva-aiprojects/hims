const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("Connected to DB!");

  const schema = 'wellness_basic';
  
  try {
    const encountersRes = await client.query(`
      SELECT e.id, e.patient_id, e.doctor_id, e.status, e.vitals, e.complaints, e.created_at,
             p.name as patient_name, p.mrn, p.phone
      FROM "${schema}".encounters e
      JOIN "${schema}".patients p ON e.patient_id = p.id
      ORDER BY e.created_at DESC LIMIT 10
    `);
    console.log("Encounters:", encountersRes.rows);
  } catch (err) {
    console.log("Error checking encounters:", err.message);
  }

  await client.end();
}

check().catch(console.error);
