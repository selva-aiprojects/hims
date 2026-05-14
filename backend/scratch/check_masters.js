const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const medicines = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "mhgcl".medicines`);
    const diseases = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "mhgcl".diseases`);
    console.log('Medicines Count:', medicines);
    console.log('Diseases Count:', diseases);
    
    if (medicines[0].count === '0' || medicines[0].count === 0) {
      console.log('Medicines table is EMPTY for mhgcl schema.');
    }
    
    const sampleMeds = await prisma.$queryRawUnsafe(`SELECT name FROM "mhgcl".medicines LIMIT 5`);
    console.log('Sample Medicines:', sampleMeds);
  } catch (err) {
    console.error('Error checking data:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
