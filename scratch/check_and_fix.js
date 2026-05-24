require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

async function checkAndFix() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const email = "admin@wellness.com";
  const newPassword = "Admin@123";
  
  try {
    // Check which schemas have this user
    const tenants = await pool.query(`SELECT id, name, db_name FROM nexus.tenants`);
    
    console.log(`\nSearching for "${email}" across all schemas...\n`);
    
    for (const t of tenants.rows) {
      try {
        const result = await pool.query(
          `SELECT id, email, role, password_hash FROM "${t.db_name}".users WHERE LOWER(email) = LOWER($1)`,
          [email]
        );
        if (result.rows.length > 0) {
          const u = result.rows[0];
          console.log(`✅ FOUND in "${t.db_name}" (${t.name}):`);
          console.log(`   Email: ${u.email}`);
          console.log(`   Role: ${u.role}`);
          console.log(`   Hash: ${u.password_hash}`);
          console.log(`   Is bcrypt: ${u.password_hash?.startsWith("$2")}`);
          
          // Try current password match
          if (u.password_hash?.startsWith("$2")) {
            const matches = await bcrypt.compare(newPassword, u.password_hash);
            console.log(`   "${newPassword}" matches current hash: ${matches}`);
          }
          
          // Now fix it
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          await pool.query(
            `UPDATE "${t.db_name}".users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
            [hashedPassword, email]
          );
          console.log(`   🔧 Password RESET to "${newPassword}" (bcrypt hashed)`);
          
          // Verify
          const verify = await bcrypt.compare(newPassword, hashedPassword);
          console.log(`   ✅ Verification: ${verify}`);
        }
      } catch (e) {
        // skip schemas that don't have users table
      }
    }
    
    // Also check the specific "Wellness Clinic" facility ID mapping
    const wellness = await pool.query(
      `SELECT id, name, db_name FROM nexus.tenants WHERE name ILIKE '%Wellness Clinic%'`
    );
    console.log(`\n=== "Wellness Clinic" tenant info ===`);
    console.log(JSON.stringify(wellness.rows, null, 2));
    
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkAndFix();
