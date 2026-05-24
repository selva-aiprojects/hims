require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

async function testBackendLogin() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const email = "admin@wellness.com";
  const password = "Admin@123";
  const schemas = ["wellness_basic", "wellness_standard", "wellness_prof"];

  try {
    for (const schema of schemas) {
      console.log(`\n--- Simulating login for schema: ${schema} ---`);
      
      const usersResult = await pool.query(
        `SELECT * FROM "${schema}".users WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      
      if (usersResult.rows.length === 0) {
        console.log(`User ${email} NOT found in schema ${schema}`);
        continue;
      }
      
      const user = usersResult.rows[0];
      console.log(`User found: ${user.email} (role: ${user.role}, name: ${user.name})`);
      
      const match = await bcrypt.compare(password, user.password_hash);
      console.log(`Password comparison match: ${match}`);
      
      if (match) {
        // Test role resolution
        let roleName = user.role;
        let roleId = null;
        
        try {
          const roleData = await pool.query(`
            SELECT r.name, r.id 
            FROM "${schema}".rbac_roles r
            JOIN "${schema}".rbac_user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
          `, [user.id]);
          
          if (roleData.rows.length > 0) {
            roleName = roleData.rows[0].name;
            roleId = roleData.rows[0].id;
            console.log(`Resolved role in rbac_roles: "${roleName}" (ID: ${roleId})`);
          } else {
            console.log("No role mapping found in rbac_user_roles, role resolves to legacy role or mapping in auth");
          }
        } catch (e) {
          console.log("RBAC role resolution failed:", e.message);
        }
      }
    }
  } catch (err) {
    console.error("Error during simulation:", err);
  } finally {
    await pool.end();
  }
}

testBackendLogin();
