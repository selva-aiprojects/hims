const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function seedDoctors() {
  try {
    console.log('Seeding doctors for ahpl schema...');
    
    // First, let's check if there are any users at all
    const allUsers = await prisma.$queryRawUnsafe('SELECT id, name, role, is_active FROM ahpl.users LIMIT 10');
    console.log('All users in ahpl schema:', allUsers);
    
    // Check specifically for doctors
    const doctors = await prisma.$queryRawUnsafe('SELECT id, name, role, specialization, is_active FROM ahpl.users WHERE role ILIKE \'%doctor%\'');
    console.log('Doctors in ahpl schema:', doctors);
    
    // If no doctors exist, create them
    if (doctors.length === 0) {
      console.log('No doctors found, creating default doctors...');
      
      const defaultDoctors = [
        { name: 'Sankaran R', email: 'sankaran@apollo.com', specialization: 'Cardiology' },
        { name: 'Maheswaran R', email: 'maheswaran@apollo.com', specialization: 'Orthopedics' },
        { name: 'Aravind Kumar', email: 'aravind@apollo.com', specialization: 'Pediatrics' }
      ];
      
      for (const doctor of defaultDoctors) {
        const id = crypto.randomUUID();
        await prisma.$executeRawUnsafe(`
          INSERT INTO ahpl.users (id, name, email, password, role, specialization, is_active)
          VALUES ('${id}', '${doctor.name}', '${doctor.email}', 'password123', 'doctor', '${doctor.specialization}', true)
        `);
        console.log('Created doctor:', doctor.name);
      }
      
      console.log('Default doctors created successfully!');
    } else {
      console.log('Doctors already exist:', doctors.length);
      
      // Update any doctors with NULL is_active to true
      const updateResult = await prisma.$executeRawUnsafe('UPDATE ahpl.users SET is_active = true WHERE is_active IS NULL AND role ILIKE \'%doctor%\'');
      console.log('Updated NULL is_active to true for doctors');
    }
    
    // Verify doctors after seeding
    const finalDoctors = await prisma.$queryRawUnsafe('SELECT id, name, role, specialization, is_active FROM ahpl.users WHERE role ILIKE \'%doctor%\' AND is_active = true');
    console.log('Final active doctors:', finalDoctors);
    console.log('Number of active doctors:', finalDoctors.length);
    
  } catch (error) {
    console.error('Error seeding doctors:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedDoctors();
