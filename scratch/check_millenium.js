require('dotenv').config();
const { Pool } = require('pg');

async function checkMillenium() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  
  const pool = new Pool({ 
    connectionString: dbUrl.toString(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT id, name, code, db_name, plan 
      FROM nexus.tenants 
      WHERE name ILIKE '%Millenium%'
    `);
    
    console.log('--- MILLENIUM HOSPITALS TENANT ---');
    console.log(JSON.stringify(res.rows, null, 2));
    
    if (res.rows.length > 0) {
        const schema = res.rows[0].db_name;
        console.log(`\n--- USERS IN ${schema} ---`);
        const usersRes = await pool.query(`SELECT id, name, email, role FROM "${schema}".users`);
        console.log(JSON.stringify(usersRes.rows, null, 2));

        console.log(`\n--- RBAC ROLES IN ${schema} ---`);
        const rolesRes = await pool.query(`SELECT id, name FROM "${schema}".rbac_roles`);
        console.log(JSON.stringify(rolesRes.rows, null, 2));

        console.log(`\n--- RBAC USER ROLES IN ${schema} ---`);
        const userRolesRes = await pool.query(`
            SELECT u.email, r.name as role_name
            FROM "${schema}".users u
            JOIN "${schema}".rbac_user_roles ur ON u.id = ur.user_id
            JOIN "${schema}".rbac_roles r ON r.id = ur.role_id
        `);
        console.log(JSON.stringify(userRolesRes.rows, null, 2));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkMillenium();
