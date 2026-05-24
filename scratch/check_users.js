require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");

async function checkUsers() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check all tenants
    const tenants = await pool.query(`SELECT id, name, db_name, admin_email FROM nexus.tenants`);
    console.log("=== TENANTS ===");
    for (const t of tenants.rows) {
      console.log(`  ${t.name} (schema: ${t.db_name}, admin_email: ${t.admin_email})`);
      
      // List users in each schema
      try {
        const users = await pool.query(`SELECT id, name, email, role, password_hash FROM "${t.db_name}".users`);
        console.log(`    Users in ${t.db_name}:`);
        for (const u of users.rows) {
          const isBcrypt = u.password_hash && u.password_hash.startsWith("$2");
          console.log(`      - ${u.email} (role: ${u.role}, hash valid: ${isBcrypt}, hash: ${(u.password_hash || "NULL").substring(0, 20)}...)`);
        }
      } catch (e) {
        console.log(`    Could not query users: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
