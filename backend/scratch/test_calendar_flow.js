const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFlow() {
  const schema = 'ahpl';
  const doctorId = 'f9c1663d-324d-4700-915a-36641c6ac17f';
  const today = new Date().toLocaleDateString('en-CA');

  console.log(`--- TESTING CALENDAR FLOW for Schema: ${schema} ---`);
  
  try {
    // 1. Verify Doctor Exists
    const doctor = await prisma.$queryRawUnsafe(`SELECT name FROM "${schema}".users WHERE id = '${doctorId}'`);
    if (!doctor.length) {
      console.error('ERROR: Doctor not found in schema');
      return;
    }
    console.log(`FOUND DOCTOR: ${doctor[0].name}`);

    // 2. Simulate Bulk Block (05:00 - 10:00)
    console.log(`SIMULATING BLOCK for ${today} (05:00 - 10:00)...`);
    // Note: The UI uses the bulk endpoint, but we'll check the table directly
    
    // 3. Check current blocks
    const blocks = await prisma.$queryRawUnsafe(`
      SELECT date, start_time, is_available 
      FROM "${schema}".doctor_availability 
      WHERE doctor_id = '${doctorId}' AND date = '${today}'
      ORDER BY start_time ASC
    `);
    
    console.log(`CURRENT BLOCKS for today: ${blocks.length}`);
    blocks.forEach(b => {
      console.log(`  [${b.start_time}] Available: ${b.is_available}`);
    });

    if (blocks.some(b => !b.is_available)) {
      console.log('SUCCESS: Blocked slots detected in database.');
    } else {
      console.warn('WARNING: No blocked slots found for today. User might not have clicked "BLOCK HOURS" yet or 404 happened.');
    }

  } catch (err) {
    console.error('DATABASE ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFlow();
