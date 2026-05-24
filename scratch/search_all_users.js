require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");

async function searchAllUsers() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const tenants = await pool.query(`SELECT id, name, code, db_name FROM nexus.tenants`);
    console.log("=== USERS ACROSS ALL TENANTS ===");
    for (const t of tenants.rows) {
      try {
        const result = await pool.query(
          `SELECT email, role, name, password_hash FROM "${t.db_name}".users`
        );
        console.log(`\nTenant: "${t.name}" (db: ${t.db_name}, code: ${t.code})`);
        if (result.rows.length === 0) {
          console.log("  No users found.");
        } else {
          result.rows.forEach(u => {
            console.log(`  - ${u.email} (${u.role}) - Name: ${u.name} - Hash starts with: ${u.password_hash ? u.password_hash.substring(0, 10) : 'NULL'}`);
          });
        }
      } catch (e) {
        console.log(`\nTenant: "${t.name}" (db: ${t.db_name}) - Error: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

searchAllUsers();
