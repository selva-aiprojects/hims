require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

async function provisionAndFix() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const email = "admin@wellness.com";
  const newPassword = "Admin@123";
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // List of all wellness schemas we want to verify/update
  const wellnessSchemas = [
    "wellness_hyd",
    "wellness_basic",
    "wellness_standard",
    "wellness_prof",
    "wellnessdiag_hyd",
    "wellnessnurse_hyd"
  ];

  try {
    const tenantsResult = await pool.query(`SELECT id, name, db_name FROM nexus.tenants`);
    console.log(`Found ${tenantsResult.rows.length} total tenants in nexus.tenants.`);

    // 1. First, check if schemas are missing users table and provision them
    const schemaPath = path.join(__dirname, "../database/SHARD_Base_Schema.sql");
    let sqlStatements = [];
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, "utf8");
      // Split statements on semicolon, but handle potential issues
      sqlStatements = sqlContent
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));
      console.log(`Loaded base schema from ${schemaPath} (${sqlStatements.length} statements).`);
    } else {
      console.error(`Base schema not found at ${schemaPath}!`);
      return;
    }

    for (const t of tenantsResult.rows) {
      const dbName = t.db_name.toLowerCase();
      
      // Let's check if the users table exists in this schema
      let usersTableExists = false;
      try {
        const checkTable = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = 'users'
          );
        `, [dbName]);
        usersTableExists = checkTable.rows[0].exists;
      } catch (err) {
        // Schema might not exist
      }

      if (!usersTableExists) {
        console.log(`\n⚙️ Schema or table "users" is missing for "${t.name}" (db: ${dbName}). Provisioning...`);
        
        // Create schema
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbName}"`);
        
        // Execute base schema statements
        let successCount = 0;
        for (const stmt of sqlStatements) {
          try {
            await pool.query(`SET search_path TO "${dbName}", public; ${stmt}`);
            successCount++;
          } catch (stmtErr) {
            // Ignore minor errors like drop table if exists or inserts that might fail
            if (!stmtErr.message.includes("does not exist") && !stmtErr.message.includes("already exists")) {
              // console.warn(`      Warning on stmt: ${stmtErr.message}`);
            }
          }
        }
        console.log(`  ✅ Schema "${dbName}" provisioned: executed ${successCount}/${sqlStatements.length} statements successfully.`);
      } else {
        console.log(`  Table "users" already exists in schema "${dbName}".`);
      }
    }

    // 2. Now ensure admin@wellness.com is correctly configured in all Wellness schemas
    console.log(`\n--- Setting up "${email}" across Wellness schemas ---`);
    for (const schema of wellnessSchemas) {
      try {
        // Verify schema exists first
        const schemaCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.schemata WHERE schema_name = $1
          );
        `, [schema]);
        if (!schemaCheck.rows[0].exists) {
          console.log(`Schema "${schema}" does not exist, skipping user creation.`);
          continue;
        }

        // Insert or update admin@wellness.com
        const checkUser = await pool.query(
          `SELECT id, password_hash FROM "${schema}".users WHERE LOWER(email) = LOWER($1)`,
          [email]
        );

        let userId;
        if (checkUser.rows.length === 0) {
          console.log(`  Creating user "${email}" in "${schema}"...`);
          const insertRes = await pool.query(`
            INSERT INTO "${schema}".users (name, email, password_hash, role, is_active)
            VALUES ('Dr. Mrutyunjaya', $1, $2, 'admin', true)
            RETURNING id
          `, [email, hashedPassword]);
          userId = insertRes.rows[0].id;
        } else {
          console.log(`  Updating password for user "${email}" in "${schema}"...`);
          const existingUser = checkUser.rows[0];
          userId = existingUser.id;
          await pool.query(
            `UPDATE "${schema}".users SET password_hash = $1, role = 'admin', is_active = true WHERE id = $2`,
            [hashedPassword, userId]
          );
        }

        // Ensure RBAC tables exist and ADMIN role is linked
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "${schema}".rbac_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS "${schema}".rbac_user_roles (
            user_id UUID REFERENCES "${schema}".users(id) ON DELETE CASCADE,
            role_id UUID REFERENCES "${schema}".rbac_roles(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, role_id)
          );
        `);

        // Ensure ADMIN role exists
        await pool.query(`
          INSERT INTO "${schema}".rbac_roles (name, description)
          VALUES ('ADMIN', 'Full system access with PII masking for audit purposes')
          ON CONFLICT (name) DO NOTHING
        `);

        const roleRes = await pool.query(`SELECT id FROM "${schema}".rbac_roles WHERE name = 'ADMIN'`);
        const roleId = roleRes.rows[0].id;

        // Ensure user-role link exists
        await pool.query(`
          INSERT INTO "${schema}".rbac_user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [userId, roleId]);

        console.log(`  ✅ User "${email}" successfully configured and mapped to ADMIN in schema "${schema}".`);

      } catch (err) {
        console.error(`  ❌ Error processing schema "${schema}":`, err.message);
      }
    }

  } catch (err) {
    console.error("Critical Error:", err);
  } finally {
    await pool.end();
  }
}

provisionAndFix();
