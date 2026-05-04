require("dotenv/config");
const { prisma } = require("../src/config/prisma");

async function forceSyncMenus() {
  try {
    console.log("--- Force Syncing AI Lab Assistant Menu ---");
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);

    for (const t of tenants) {
      const schema = t.db_name;
      console.log(`[SHARD] Patching ${schema}...`);
      try {
        // 1. Conditional Insert for Menu
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${schema}".rbac_menus (label, path, icon, sort_order, required_plan)
          SELECT 'AI Lab Assistant', '/tenant/lab/ai', 'Lab', 9, 'professional'
          WHERE NOT EXISTS (SELECT 1 FROM "${schema}".rbac_menus WHERE label = 'AI Lab Assistant')
        `);

        // Update if exists but path is wrong
        await prisma.$executeRawUnsafe(`
          UPDATE "${schema}".rbac_menus SET path = '/tenant/lab/ai' 
          WHERE label = 'AI Lab Assistant'
        `);

        // 2. Link to Roles
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
          SELECT r.id, m.id 
          FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
          WHERE m.label = 'AI Lab Assistant' 
          AND r.name IN ('ADMIN', 'DOCTOR', 'LAB_TECH', 'LAB_ASSISTANT')
          ON CONFLICT DO NOTHING
        `);
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
