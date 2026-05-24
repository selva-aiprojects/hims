require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");

async function queryUsers() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Checking schemas in the database...");
    const schemas = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
    `);
    console.log("Available schemas:", schemas.rows.map(r => r.schema_name));

    const schema = "wellness_hyd";
    console.log(`\nChecking tables in schema "${schema}"...`);
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1
    `, [schema]);
    console.log("Tables:", tables.rows.map(r => r.table_name));

    if (tables.rows.some(r => r.table_name === 'users')) {
      console.log(`\nListing users in "${schema}".users...`);
      const users = await pool.query(`SELECT id, email, role, password_hash FROM "${schema}".users`);
      console.log(users.rows);
    } else {
      console.log(`\nNo "users" table found in schema "${schema}".`);
    }

  } catch (err) {
    console.error("Error details:", err);
  } finally {
    await pool.end();
  }
}

queryUsers();
