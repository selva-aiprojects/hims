/**
 * RBAC Full Fix & Seed for Millenium Hospitals (mhgcl shard)
 * ============================================================
 * Run: node scratch/rbac_fix_millenium.js
 *
 * This script is IDEMPOTENT — safe to run multiple times.
 * It will:
 *  1. Ensure all RBAC tables exist
 *  2. Wipe & re-seed all menus with correct required_plan values
 *  3. Wipe & re-seed all role-menu mappings per standard matrix
 *  4. Create test staff accounts for each role (if not already present)
 *  5. Link every user in the shard to their correct RBAC role
 *  6. Print a final verification report
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ─── Standard RBAC Matrix ──────────────────────────────────────────────────
// Which menu LABELS each role can access (plan filter is applied separately)
const ROLE_MENU_MATRIX = {
  ADMIN:        'ALL', // Admin gets everything within the tenant's plan tier
  DOCTOR:       ['Dashboard', "Doctor's Queue", 'Laboratory'],
  NURSE:        ['Dashboard'],
  PHARMACIST:   ['Dashboard', 'Pharmacy Dashboard', 'Stock Inventory', 'Prescription Queue'],
  LAB_TECH:     ['Dashboard', 'Laboratory'],
  RECEPTIONIST: ['Dashboard', 'OPD Registration'],
  SUPPORT:      ['Dashboard'],
};

// ─── Menu Definitions (Standard Tier) ─────────────────────────────────────
const MENUS = [
  // ── Basic Tier ──
  { label: 'Dashboard',              path: '/tenant/dashboard',           icon: 'Dashboard', sort_order: 1,  required_plan: 'basic' },
  { label: 'OPD Registration',       path: '/tenant/opd/registration',    icon: 'OPD',       sort_order: 2,  required_plan: 'basic' },
  { label: "Doctor's Queue",         path: '/tenant/opd/queue',           icon: 'Doctor',    sort_order: 3,  required_plan: 'basic' },
  { label: 'Invoicing & Billing',    path: '/billing',                    icon: 'Billing',   sort_order: 10, required_plan: 'basic' },
  { label: 'Branding & UI Settings', path: '/tenant/settings',            icon: 'Settings',  sort_order: 12, required_plan: 'basic' },
  { label: 'Staff & RBAC',           path: '/tenant/staff',               icon: 'Doctor',    sort_order: 13, required_plan: 'basic' },
  // ── Standard Tier ──
  { label: 'Laboratory',             path: '/tenant/lab',                 icon: 'Lab',       sort_order: 4,  required_plan: 'standard' },
  { label: 'Pharmacy Dashboard',     path: '/tenant/pharmacy/dashboard',  icon: 'Pharmacy',  sort_order: 5,  required_plan: 'standard' },
  { label: 'Stock Inventory',        path: '/tenant/pharmacy/inventory',  icon: 'Pill',      sort_order: 6,  required_plan: 'standard' },
  { label: 'Prescription Queue',     path: '/tenant/pharmacy/queue',      icon: 'Receipt',   sort_order: 7,  required_plan: 'standard' },
  { label: 'Hospital Settings (Masters)', path: '/tenant/masters',        icon: 'Settings',  sort_order: 11, required_plan: 'standard' },
  // ── Professional Tier ──
  { label: 'IPD Bed Map',            path: '/tenant/ipd/beds',            icon: 'Bed',       sort_order: 8,  required_plan: 'professional' },
  { label: 'IPD Census & Daycare',   path: '/tenant/ipd/admissions',      icon: 'Clipboard', sort_order: 9,  required_plan: 'professional' },
  { label: 'Discharge Summaries',    path: '/tenant/ipd/discharge',       icon: 'Receipt',   sort_order: 15, required_plan: 'professional' },
  { label: 'Insurance Management',   path: '/tenant/billing/insurance',   icon: 'Receipt',   sort_order: 14, required_plan: 'professional' },
];

// ─── Test Accounts to Create ───────────────────────────────────────────────
const TEST_USERS = [
  { name: 'Dr. Test Doctor',       email: 'doctor@mhgcl.com',      role: 'doctor',       rbacRole: 'DOCTOR' },
  { name: 'Test Nurse',            email: 'nurse@mhgcl.com',        role: 'nurse',        rbacRole: 'NURSE' },
  { name: 'Test Pharmacist',       email: 'pharmacist@mhgcl.com',   role: 'pharmacist',   rbacRole: 'PHARMACIST' },
  { name: 'Test Lab Tech',         email: 'labtech@mhgcl.com',      role: 'lab_assistant',rbacRole: 'LAB_TECH' },
  { name: 'Test Receptionist',     email: 'reception@mhgcl.com',    role: 'receptionist', rbacRole: 'RECEPTIONIST' },
];

const DEFAULT_PASSWORD = 'Admin@123';

async function main() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('schema');
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });
  const log = (msg) => console.log(msg);
  const ok = (msg) => console.log(`  ✅ ${msg}`);
  const warn = (msg) => console.log(`  ⚠️  ${msg}`);
  const err = (msg) => console.log(`  ❌ ${msg}`);
  const sep = () => log('─'.repeat(65));

  try {
    // ── Step 1: Find Millenium shard ─────────────────────────────────────
    sep();
    log('🔍  Finding Millenium Hospitals...');
    const tenantRes = await pool.query(`SELECT id, name, db_name, plan FROM nexus.tenants WHERE name ILIKE '%Millenium%'`);
    if (tenantRes.rows.length === 0) { err('Millenium Hospitals not found in nexus.tenants!'); process.exit(1); }
    const tenant = tenantRes.rows[0];
    const S = tenant.db_name; // schema shorthand
    const plan = (tenant.plan || 'standard').toLowerCase();
    log(`    Tenant: ${tenant.name}  |  Schema: ${S}  |  Plan: ${plan.toUpperCase()}`);

    // ── Step 2: Ensure RBAC Tables Exist ────────────────────────────────
    sep();
    log('🔧  Ensuring RBAC tables exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${S}".rbac_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${S}".rbac_menus (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label VARCHAR(100) NOT NULL,
        path VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        required_plan VARCHAR(50) DEFAULT 'basic',
        parent_id UUID REFERENCES "${S}".rbac_menus(id),
        sort_order INT DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS "${S}".rbac_role_menus (
        role_id UUID REFERENCES "${S}".rbac_roles(id) ON DELETE CASCADE,
        menu_id UUID REFERENCES "${S}".rbac_menus(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, menu_id)
      );
      CREATE TABLE IF NOT EXISTS "${S}".rbac_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS "${S}".rbac_role_permissions (
        role_id UUID REFERENCES "${S}".rbac_roles(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES "${S}".rbac_permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
      CREATE TABLE IF NOT EXISTS "${S}".rbac_user_roles (
        user_id UUID REFERENCES "${S}".users(id) ON DELETE CASCADE,
        role_id UUID REFERENCES "${S}".rbac_roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );
    `);
    ok('RBAC tables ensured');

    // ── Step 3: Seed Roles ───────────────────────────────────────────────
    sep();
    log('🔑  Seeding RBAC roles...');
    const roleDefinitions = [
      ['ADMIN',        'Full system access - all modules'],
      ['DOCTOR',       'Clinical access - OPD, consultation, lab orders'],
      ['NURSE',        'Nursing access - vitals, in-patient care'],
      ['PHARMACIST',   'Pharmacy access - inventory, dispensing, prescriptions'],
      ['LAB_TECH',     'Lab access - test queue and result entry'],
      ['RECEPTIONIST', 'Front desk - patient registration and appointments'],
      ['SUPPORT',      'General staff - read-only access'],
    ];
    for (const [name, desc] of roleDefinitions) {
      await pool.query(`INSERT INTO "${S}".rbac_roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = $2`, [name, desc]);
      ok(`Role: ${name}`);
    }

    // Fetch role IDs
    const rolesRes = await pool.query(`SELECT id, name FROM "${S}".rbac_roles`);
    const roleMap = {};
    rolesRes.rows.forEach(r => roleMap[r.name] = r.id);

    // ── Step 4: Wipe & Re-seed Menus ────────────────────────────────────
    sep();
    log('📑  Re-seeding menus (clearing old data first)...');
    await pool.query(`DELETE FROM "${S}".rbac_role_menus`);
    await pool.query(`DELETE FROM "${S}".rbac_menus`);
    ok('Old menu data cleared');

    for (const menu of MENUS) {
      await pool.query(
        `INSERT INTO "${S}".rbac_menus (label, path, icon, sort_order, required_plan) VALUES ($1, $2, $3, $4, $5)`,
        [menu.label, menu.path, menu.icon, menu.sort_order, menu.required_plan]
      );
      ok(`Menu: [${menu.required_plan.padEnd(12)}] ${menu.label}`);
    }

    // Fetch menu IDs
    const menusRes = await pool.query(`SELECT id, label FROM "${S}".rbac_menus`);
    const menuMap = {};
    menusRes.rows.forEach(m => menuMap[m.label] = m.id);

    // ── Step 5: Seed Role-Menu Mappings ─────────────────────────────────
    sep();
    log('🔗  Seeding role-menu mappings...');
    for (const [roleName, menuLabels] of Object.entries(ROLE_MENU_MATRIX)) {
      const roleId = roleMap[roleName];
      if (!roleId) { warn(`Role ${roleName} not found, skipping`); continue; }

      const labelsToMap = menuLabels === 'ALL' ? Object.keys(menuMap) : menuLabels;
      log(`\n  → ${roleName}:`);
      for (const label of labelsToMap) {
        const menuId = menuMap[label];
        if (!menuId) { warn(`    Menu "${label}" not found`); continue; }
        await pool.query(
          `INSERT INTO "${S}".rbac_role_menus (role_id, menu_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleId, menuId]
        );
        ok(`    ${label}`);
      }
    }

    // ── Step 6: Create Test Users for Each Role ──────────────────────────
    sep();
    log('👤  Creating test staff accounts (if not existing)...');
    const hashedPwd = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const user of TEST_USERS) {
      // Upsert user
      const existing = await pool.query(`SELECT id, role FROM "${S}".users WHERE LOWER(email) = LOWER($1)`, [user.email]);
      let userId;
      if (existing.rows.length === 0) {
        const ins = await pool.query(
          `INSERT INTO "${S}".users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
          [user.name, user.email, hashedPwd, user.role]
        );
        userId = ins.rows[0].id;
        ok(`Created: ${user.email}  [${user.role}]`);
      } else {
        userId = existing.rows[0].id;
        // Update password_hash to ensure login works
        await pool.query(`UPDATE "${S}".users SET password_hash = $1, role = $2 WHERE id = $3`, [hashedPwd, user.role, userId]);
        ok(`Exists:  ${user.email}  [${user.role}] — password reset`);
      }

      // Link to RBAC role
      const rbacRoleId = roleMap[user.rbacRole];
      if (rbacRoleId) {
        await pool.query(
          `INSERT INTO "${S}".rbac_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, rbacRoleId]
        );
        ok(`    → Linked to RBAC role: ${user.rbacRole}`);
      }
    }

    // ── Step 7: Link ALL existing users to their RBAC roles ─────────────
    sep();
    log('🔄  Linking all existing shard users to RBAC roles...');
    const allUsers = await pool.query(`SELECT id, email, role FROM "${S}".users`);
    for (const u of allUsers.rows) {
      const userRoleName = (u.role || 'support').toUpperCase().replace('LAB_ASSISTANT', 'LAB_TECH');
      const rbacRoleId = roleMap[userRoleName] || roleMap['SUPPORT'];
      if (rbacRoleId) {
        await pool.query(
          `INSERT INTO "${S}".rbac_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [u.id, rbacRoleId]
        );
        ok(`${u.email} → ${userRoleName}`);
      }
    }

    // ── Step 8: Final Verification Report ───────────────────────────────
    sep();
    log('\n📋  FINAL VERIFICATION — MENU ACCESS PER ROLE (Standard Plan):\n');

    const planTiers = { basic: ['basic'], standard: ['basic', 'standard'], professional: ['basic', 'standard', 'professional'], enterprise: ['basic', 'standard', 'professional', 'enterprise'] };
    const allowedPlans = planTiers[plan] || ['basic'];
    const planFilter = allowedPlans.map(p => `'${p}'`).join(',');

    for (const role of rolesRes.rows) {
      const menuRes = await pool.query(`
        SELECT m.label, m.required_plan
        FROM "${S}".rbac_menus m
        JOIN "${S}".rbac_role_menus rm ON m.id = rm.menu_id
        WHERE rm.role_id = $1 AND m.required_plan IN (${planFilter})
        ORDER BY m.sort_order
      `, [role.id]);

      const userCountRes = await pool.query(`
        SELECT COUNT(*) FROM "${S}".rbac_user_roles WHERE role_id = $1
      `, [role.id]);

      log(`  ┌─ ${role.name.padEnd(14)} (${userCountRes.rows[0].count} users)`);
      if (menuRes.rows.length === 0) {
        log(`  │  ⚠️  No menus assigned for this plan tier`);
      } else {
        menuRes.rows.forEach(m => log(`  │  ✅ ${m.label.padEnd(35)} [${m.required_plan}]`));
      }
      log(`  └${'─'.repeat(52)}`);
    }

    sep();
    log('\n🎉  All RBAC data seeded and verified!\n');
    log(`  Test accounts (password: ${DEFAULT_PASSWORD}):`);
    TEST_USERS.forEach(u => log(`  - ${u.email.padEnd(28)} → ${u.rbacRole}`));
    log(`  - admin@mhgcl.com                → ADMIN\n`);
    sep();

  } catch (e) {
    console.error('\n❌ Fatal Error:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

main();
