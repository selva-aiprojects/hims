const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function checkTenants() {
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT * FROM nexus.tenants');
    console.log('Available tenants:');
    console.log(JSON.stringify(tenants, null, 2));
    
    // Check if Apollo Hospital exists
    const apollo = tenants.find(t => t.name && t.name.toLowerCase().includes('apollo'));
    if (apollo) {
      console.log('\nApollo Hospital found:', apollo);
      
      // Check users in that schema
      const users = await prisma.$queryRawUnsafe(`SELECT id, name, role, specialization, is_active FROM "${apollo.db_name.toLowerCase()}".users WHERE role ILIKE '%doctor%' OR role = 'DOCTOR'`);
      console.log('\nDoctors in Apollo schema:', users);
    } else {
      console.log('\nApollo Hospital not found in tenants table');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();
