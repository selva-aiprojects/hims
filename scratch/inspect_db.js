const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'nexus' AND table_name = 'tenants' AND column_name = 'id'
    `);
    console.log("Nexus Tenants ID Column Info:", columns);

    const extensions = await prisma.$queryRawUnsafe(`SELECT extname FROM pg_extension`);
    console.log("Extensions:", extensions);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
