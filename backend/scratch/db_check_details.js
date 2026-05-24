require('dotenv').config();
const { getPrisma } = require('../src/config/prisma');
const prisma = getPrisma();

async function main() {
  try {
    const schema = 'wellness_basic';
    console.log(`=== Users in ${schema} ===`);
    const users = await prisma.$queryRawUnsafe(`SELECT id, email, role, name FROM "${schema}".users`);
    console.log(users);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
