require('dotenv').config({ path: __dirname + '/../.env' });
const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function inspectWellness() {
  const schema = 'wellness_basic';
  console.log(`=== Inspecting Schema: ${schema} ===`);
  try {
    const patients = await prisma.$queryRawUnsafe(`SELECT id, name, gender, created_at FROM "${schema}".patients`);
    console.log(`Patients (${patients.length}):`);
    patients.forEach(r => console.log(`  - ${r.id}: ${r.name} (${r.gender}) - Created: ${r.created_at}`));

    const appointments = await prisma.$queryRawUnsafe(`
      SELECT a.id, a.appointment_time, a.status, p.name as patient_name 
      FROM "${schema}".appointments a 
      JOIN "${schema}".patients p ON a.patient_id = p.id
    `);
    console.log(`\nAppointments (${appointments.length}):`);
    appointments.forEach(r => console.log(`  - ${r.id}: Time: ${r.appointment_time}, Status: ${r.status}, Patient: ${r.patient_name}`));

    const encounterCols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = '${schema}' AND table_name = 'encounters'
    `);
    console.log(`\nEncounter columns:`);
    encounterCols.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    const encounters = await prisma.$queryRawUnsafe(`
      SELECT e.*, p.name as patient_name 
      FROM "${schema}".encounters e
      JOIN "${schema}".patients p ON e.patient_id = p.id
    `);
    console.log(`\nEncounters (${encounters.length}):`);
    encounters.forEach(r => console.log(`  - ${r.id}: Status: ${r.status}, Patient: ${r.patient_name}`));
    
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectWellness();
