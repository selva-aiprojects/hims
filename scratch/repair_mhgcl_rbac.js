const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schemaName = "mhgcl";
  
  console.log(`[REPAIR] Starting RBAC repair for ${schemaName}...`);

  // 1. Ensure rbac_user_roles is populated for all users based on their 'role' column
  const users = await prisma.$queryRawUnsafe(`SELECT id, role, email FROM "${schemaName}".users`);
  const roles = await prisma.$queryRawUnsafe(`SELECT id, name FROM "${schemaName}".rbac_roles`);
  
  for (const user of users) {
    const matchingRole = roles.find(r => r.name.toLowerCase() === user.role.toLowerCase());
    if (matchingRole) {
      console.log(`[REPAIR] Linking ${user.email} (${user.role}) to RBAC Role ${matchingRole.name}`);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".rbac_user_roles (user_id, role_id)
        VALUES ('${user.id}', '${matchingRole.id}')
        ON CONFLICT DO NOTHING
      `);
    } else {
      console.warn(`[REPAIR] No matching RBAC role found for user ${user.email} with role ${user.role}`);
    }
  }

  // 2. Fix potential typo in admin accounts domain if needed (optional but good for consistency)
  await prisma.$executeRawUnsafe(`UPDATE "${schemaName}".users SET email = REPLACE(email, '@mhcgl.com', '@mhgcl.com') WHERE email LIKE '%@mhcgl.com'`);
  
  // 3. Ensure role_id for ADMIN is linked to all menus if missed
  const adminRole = roles.find(r => r.name === 'ADMIN');
  if (adminRole) {
     await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".rbac_role_menus (role_id, menu_id)
        SELECT '${adminRole.id}', id FROM "${schemaName}".rbac_menus
        ON CONFLICT DO NOTHING
     `);
     console.log("[REPAIR] Verified ADMIN role has all menus.");
  }

  console.log("[REPAIR] RBAC repair completed.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
