const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schemaName = "mhgcl";
  const users = await prisma.$queryRawUnsafe(`SELECT id, email, role, name FROM "${schemaName}".users`);
  console.log(JSON.stringify(users, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
