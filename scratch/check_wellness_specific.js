require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");

async function checkSpecific() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const email = "admin@wellness.com";
  const schemas = ["wellness_hyd", "wellnessdiag_hyd", "wellnessnurse_hyd"];

  try {
    for (const schema of schemas) {
      const result = await pool.query(
        `SELECT email, role, name, password_hash FROM "${schema}".users WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      console.log(`\nSchema: ${schema}`);
      if (result.rows.length === 0) {
        console.log("  ❌ User NOT found!");
      } else {
        const u = result.rows[0];
        console.log(`  ✅ User: ${u.email} (${u.role}) - Name: ${u.name} - Hash: ${u.password_hash}`);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkSpecific();
