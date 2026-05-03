/**
 * RBAC Full Diagnostic for Millenium Hospitals
 * Run: node scratch/rbac_audit_millenium.js
 * 
 * This script:
 * 1. Finds Millenium Hospitals shard
 * 2. Lists all users and their roles
 * 3. Shows what menus each role is authorized to see (Standard plan filter)
 * 4. Flags any gaps vs expected matrix
 */
require('dotenv').config();
const { Pool } = require('pg');

const EXPECTED_MATRIX = {
  admin:       ['Dashboard', "OPD Registration", "Doctor's Queue", "Invoicing & Billing", "Branding & UI Settings", "Staff & RBAC", "Laboratory", "Pharmacy Dashboard", "Stock Inventory", "Prescription Queue", "Hospital Settings (Masters)"],
  doctor:      ['Dashboard', "Doctor's Queue", "Laboratory"],
  nurse:       ['Dashboard'],
  pharmacist:  ['Dashboard', "Pharmacy Dashboard", "Stock Inventory", "Prescription Queue"],
  lab_tech:    ['Dashboard', "Laboratory"],
  receptionist:['Dashboard', "OPD Registration"],
  support:     ['Dashboard'],
};

const PLAN_TIERS = {
  basic:        ['basic'],
  standard:     ['basic', 'standard'],
  professional: ['basic', 'standard', 'professional'],
  enterprise:   ['basic', 'standard', 'professional', 'enterprise'],
};

async function main() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('schema');
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  const sep = () => console.log('─'.repeat(70));

  try {
    // 1. Find Millenium Hospitals
    const tenantRes = await pool.query(`SELECT id, name, db_name, plan FROM nexus.tenants WHERE name ILIKE '%Millenium%'`);
    if (tenantRes.rows.length === 0) {
      console.error('❌ Millenium Hospitals not found in nexus.tenants!');
      process.exit(1);
    }
    const tenant = tenantRes.rows[0];
    const schema = tenant.db_name;
    const plan = (tenant.plan || 'basic').toLowerCase();
    const allowedPlans = PLAN_TIERS[plan] || ['basic'];

    sep();
    console.log(`🏥  TENANT   : ${tenant.name}`);
    console.log(`📦  SHARD    : ${schema}`);
    console.log(`💳  PLAN     : ${plan.toUpperCase()}`);
    console.log(`📋  ALLOWED TIERS: ${allowedPlans.join(', ')}`);
    sep();

    // 2. All Users
    console.log('\n👥  USERS IN SHARD:\n');
    const usersRes = await pool.query(`SELECT id, name, email, role FROM "${schema}".users ORDER BY role`);
    usersRes.rows.forEach(u => console.log(`  [${(u.role || 'N/A').padEnd(14)}]  ${u.name.padEnd(25)} ${u.email}`));

    // 3. RBAC Roles
    sep();
    console.log('\n🔑  RBAC ROLES SEEDED:\n');
    const rolesRes = await pool.query(`SELECT id, name FROM "${schema}".rbac_roles ORDER BY name`);
    rolesRes.rows.forEach(r => console.log(`  ${r.name} (${r.id})`));

    // 4. RBAC Menus
    sep();
    console.log('\n📑  RBAC MENUS SEEDED:\n');
    const menusRes = await pool.query(`SELECT label, path, icon, required_plan, sort_order FROM "${schema}".rbac_menus ORDER BY sort_order`);
    menusRes.rows.forEach(m => console.log(`  [${(m.required_plan || 'basic').padEnd(12)}]  ${m.label.padEnd(35)} → ${m.path}`));

    // 5. Per-Role Menu Check
    sep();
    console.log('\n🔐  PER-ROLE AUTHORIZED MENUS (filtered by plan):\n');

    const planFilter = allowedPlans.map(p => `'${p}'`).join(',');

    for (const role of rolesRes.rows) {
      const roleName = role.name.toLowerCase();
      const menuRes = await pool.query(`
        SELECT m.label, m.required_plan
        FROM "${schema}".rbac_menus m
        JOIN "${schema}".rbac_role_menus rm ON m.id = rm.menu_id
        WHERE rm.role_id = $1 AND m.required_plan IN (${planFilter})
        ORDER BY m.sort_order
      `, [role.id]);

      const actualMenus = menuRes.rows.map(m => m.label);
      const expectedMenus = EXPECTED_MATRIX[roleName] || [];

      console.log(`\n  ┌─ ${role.name} ────────────────────────────────`);
      
      if (actualMenus.length === 0) {
        console.log(`  │  ⚠️  NO MENUS MAPPED — role-menu links missing!`);
      } else {
        actualMenus.forEach(m => {
          const expected = expectedMenus.includes(m);
          console.log(`  │  ${expected ? '✅' : '⚠️ EXTRA'} ${m}`);
        });
        expectedMenus.forEach(m => {
          if (!actualMenus.includes(m)) {
            console.log(`  │  ❌ MISSING: ${m}`);
          }
        });
      }

      // User role mapping check
      const userRoleRes = await pool.query(`
        SELECT u.email FROM "${schema}".users u
        JOIN "${schema}".rbac_user_roles ur ON u.id = ur.user_id
        WHERE ur.role_id = $1
      `, [role.id]);
      
      if (userRoleRes.rows.length > 0) {
        console.log(`  │  👤 Users: ${userRoleRes.rows.map(u => u.email).join(', ')}`);
      } else {
        console.log(`  │  ⚠️  No users linked to this role`);
      }
      console.log(`  └─────────────────────────────────────────────`);
    }

    // 6. Users with NO role mapping
    sep();
    const unmappedRes = await pool.query(`
      SELECT u.email, u.role as users_table_role
      FROM "${schema}".users u
      WHERE u.id NOT IN (SELECT user_id FROM "${schema}".rbac_user_roles)
    `);
    if (unmappedRes.rows.length > 0) {
      console.log('\n⚠️  USERS WITH NO RBAC ROLE MAPPING (will get empty sidebar):');
      unmappedRes.rows.forEach(u => console.log(`  - ${u.email}  (users.role = "${u.users_table_role}")`));
    } else {
      console.log('\n✅  All users have RBAC role mappings.');
    }

    sep();
    console.log('\n✅  Audit complete.\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

main();
