const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schemaName = "mhgcl";
  
  console.log("--- Roles ---");
  const roles = await prisma.$queryRawUnsafe(`SELECT * FROM "${schemaName}".rbac_roles`);
  console.log(roles);

  console.log("\n--- User Roles ---");
  const userRoles = await prisma.$queryRawUnsafe(`SELECT ur.*, u.email FROM "${schemaName}".rbac_user_roles ur JOIN "${schemaName}".users u ON ur.user_id = u.id`);
  console.log(userRoles);

  console.log("\n--- Menus ---");
  const menus = await prisma.$queryRawUnsafe(`SELECT * FROM "${schemaName}".rbac_menus`);
  console.log(menus);

  console.log("\n--- Role Menus ---");
  const roleMenus = await prisma.$queryRawUnsafe(`SELECT * FROM "${schemaName}".rbac_role_menus`);
  console.log(roleMenus);
  
  const tenant = await prisma.$queryRawUnsafe(`SELECT plan FROM nexus.tenants WHERE db_name = '${schemaName}'`);
  console.log("\n--- Tenant Plan ---");
  console.log(tenant);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
