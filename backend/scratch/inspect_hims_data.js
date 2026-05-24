require('dotenv').config();
const { getPrisma } = require('../src/config/prisma');
const prisma = getPrisma();

async function main() {
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name FROM nexus.tenants');
    
    for (const t of tenants) {
      const schema = t.db_name;
      console.log(`\n================ SCHEMA: ${schema} (${t.name}) ================`);
      
      const patients = await prisma.$queryRawUnsafe(`SELECT id, name, gender, created_at FROM "${schema}".patients`);
      console.log('Patients:', JSON.stringify(patients.map(p => p.name)));

      const appointments = await prisma.$queryRawUnsafe(`
        SELECT a.appointment_time, p.name as patient_name, a.status
        FROM "${schema}".appointments a
        JOIN "${schema}".patients p ON a.patient_id = p.id
      `);
      console.log('Appointments:', JSON.stringify(appointments));

      const encounters = await prisma.$queryRawUnsafe(`
        SELECT e.created_at, p.name as patient_name, e.status
        FROM "${schema}".encounters e
        JOIN "${schema}".patients p ON e.patient_id = p.id
      `);
      console.log('Encounters:', JSON.stringify(encounters));
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
