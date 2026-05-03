const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function find() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT name, code, db_name FROM nexus.tenants`);
    console.table(res);
  } catch (err) {
    console.error("Find failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

find();
