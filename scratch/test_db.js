require('dotenv/config');
const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function main() {
  try {
    const patients = await prisma.$queryRawUnsafe(
      `SELECT * FROM "wellnessdiag_hyd".patients WHERE name ILIKE '%Selvakumar%'`
    );
    console.log('FOUND PATIENTS:', JSON.stringify(patients, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
