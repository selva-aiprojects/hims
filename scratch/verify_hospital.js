require('dotenv').config();
const { Pool } = require('pg');

async function checkHospital(name) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  try {
    // 1. Find the schema name
    const tenantRes = await pool.query("SELECT db_name FROM nexus.tenants WHERE name ILIKE $1", [`%${name}%`]);
    if (tenantRes.rows.length === 0) {
      console.log(`Hospital '${name}' not found in registry.`);
      return;
    }
    const schema = tenantRes.rows[0].db_name;
    console.log(`\nChecking Hospital: ${name} (Schema: ${schema})`);

    // 2. Count Tables
    const tableRes = await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = $1", [schema]);
    const tableCount = tableRes.rows[0].count;
    console.log(`Table Count: ${tableCount}`);

    // 3. Check Master Data (Departments)
    const deptRes = await pool.query(`SELECT count(*) FROM "${schema}".departments`);
    console.log(`Department Count: ${deptRes.rows[0].count}`);

    // 4. Check Master Data (Medicines)
    const medRes = await pool.query(`SELECT count(*) FROM "${schema}".medicines`);
    console.log(`Medicine Count: ${medRes.rows[0].count}`);

  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

checkHospital('Millenium hospitals');
