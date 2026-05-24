const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("Connected to DB!");

  // List all schemas
  const schemasRes = await client.query(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  `);
  console.log("Schemas:", schemasRes.rows.map(r => r.schema_name));

  // Get columns of nexus.tenants
  try {
    const columnsRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'nexus' AND table_name = 'tenants'
    `);
    console.log("nexus.tenants columns:", columnsRes.rows.map(r => r.column_name));
    
    const tenantsRes = await client.query(`SELECT * FROM nexus.tenants LIMIT 5`);
    console.log("nexus.tenants data:", tenantsRes.rows);
  } catch (err) {
    console.log("Error checking nexus.tenants:", err.message);
  }

  await client.end();
}

check().catch(console.error);
