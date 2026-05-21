require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");

async function listTenants() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`SELECT id, name, code, db_name, plan FROM nexus.tenants`);
    console.log("=== Tenants in nexus.tenants ===");
    console.log(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

listTenants();
