const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const schemaName = "mhgcl"; // Active tenant schema
  console.log("Checking database tables for schema:", schemaName);
  
  try {
    const patients = await prisma.$queryRawUnsafe(`
      SELECT * FROM "${schemaName}".patients LIMIT 1;
    `);
    console.log("Patient record sample:", patients);
  } catch (err) {
    console.error("Error querying patients:", err.message);
  }

  try {
    const patientExists = await prisma.$queryRawUnsafe(`
      SELECT id FROM "${schemaName}".patients WHERE id = '00000000-0000-0000-0000-000000000000'
    `);
    console.log("Patient 0000 exists check result:", patientExists);
  } catch (err) {
    console.error("Error checking patient 0000:", err.message);
  }

  try {
    console.log("Trying to insert walk-in patient...");
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".patients (id, mrn, name, phone, gender, age)
      VALUES ('00000000-0000-0000-0000-000000000000', 'GENERAL', 'Walk-in Customer', '', 'N/A', 0)
    `);
    console.log("Walk-in patient inserted successfully!");
  } catch (err) {
    console.error("Error inserting walk-in patient:", err.message);
  }
  
  await prisma.$disconnect();
}

main();
