const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMeds() {
  try {
    const meds = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "ahpl".medicines`);
    console.log("Medicine count in ahpl:", meds);
    
    const sample = await prisma.$queryRawUnsafe(`SELECT name, composition FROM "ahpl".medicines LIMIT 5`);
    console.log("Sample medicines:", sample);
  } catch (err) {
    console.error("Error checking meds:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMeds();
