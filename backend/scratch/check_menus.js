require("dotenv/config");
const { prisma } = require("../src/config/prisma");

async function checkMenus() {
  const schema = "ahpl";
  try {
    const menus = await prisma.$queryRawUnsafe(`SELECT label, path FROM "${schema}".rbac_menus ORDER BY label`);
    console.log("--- Menus in ahpl ---");
    console.table(menus);
  } catch (err) {
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMenus();
