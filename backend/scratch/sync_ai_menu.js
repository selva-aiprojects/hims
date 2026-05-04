require("dotenv/config");
const { prisma } = require("../src/config/prisma");

async function forceSyncMenus() {
  try {
    console.log("--- Force Syncing All System Menus ---");
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);

    for (const t of tenants) {
      const schema = t.db_name;
      console.log(`[SHARD] Patching ${schema}...`);
      try {
        const menus = [
          { label: 'AI Lab Assistant', path: '/tenant/lab/ai', icon: 'Lab', sort: 9, plan: 'professional' },
          { label: 'Laboratory Billing', path: '/tenant/lab/billing', icon: 'Billing', sort: 11, plan: 'basic' },
          { label: 'Consultation Desk', path: '/tenant/consultation', icon: 'Doctor', sort: 5, plan: 'basic' },
          { label: 'OPD Billing & Revenue Center', path: '/billing?type=OPD', icon: 'Billing', sort: 10, plan: 'basic' },
          { label: 'Staff & RBAC', path: '/tenant/staff', icon: 'Settings', sort: 20, plan: 'basic' }
        ];

        for (const m of menus) {
          // 1. Ensure Menu Exists
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${schema}".rbac_menus (label, path, icon, sort_order, required_plan)
            SELECT '${m.label}', '${m.path}', '${m.icon}', ${m.sort}, '${m.plan}'
            WHERE NOT EXISTS (SELECT 1 FROM "${schema}".rbac_menus WHERE label = '${m.label}')
          `);
          await prisma.$executeRawUnsafe(`UPDATE "${schema}".rbac_menus SET path = '${m.path}' WHERE label = '${m.label}'`);

          // 2. Link to Roles
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
            SELECT r.id, mn.id 
            FROM "${schema}".rbac_roles r, "${schema}".rbac_menus mn
            WHERE mn.label = '${m.label}' 
            AND r.name IN ('ADMIN', 'DOCTOR', 'LAB_TECH', 'LAB_ASSISTANT', 'RECEPTIONIST')
            ON CONFLICT DO NOTHING
          `);
        }
        console.log(`[SHARD] ${schema} patched.`);
      } catch (err) {
        console.error(`[SHARD] Failed ${schema}:`, err.message);
      }
    }
    console.log("--- Done ---");
  } catch (err) {
    console.error("--- Global Failure ---", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

forceSyncMenus();
