const { getPrisma } = require('../backend/src/config/prisma');
const prisma = getPrisma();

async function checkDoctorsAndAvailability() {
  try {
    console.log('Checking doctors in ahpl schema...');
    
    // Check if there are any active doctors in ahpl schema
    const doctors = await prisma.$queryRawUnsafe('SELECT id, name, role, specialization, is_active FROM ahpl.users WHERE role ILIKE \'%doctor%\' AND is_active = true');
    console.log('Active doctors in ahpl schema:', doctors);
    console.log('Number of active doctors:', doctors.length);
    
    if (doctors.length > 0) {
      // Check if there are any schedule rules for these doctors
      const doctorId = doctors[0].id;
      console.log('Checking schedules for doctor:', doctorId);
      
      const schedules = await prisma.$queryRawUnsafe(`SELECT * FROM ahpl.doctor_schedules WHERE doctor_id = '${doctorId}'`);
      console.log('Schedule rules for first doctor:', schedules);
      console.log('Number of schedule rules:', schedules.length);
      
      // Check if there are any appointments
      const appointments = await prisma.$queryRawUnsafe(`SELECT * FROM ahpl.appointments WHERE doctor_id = '${doctorId}' LIMIT 5`);
      console.log('Recent appointments:', appointments);
      console.log('Number of appointments:', appointments.length);
      
      // Check all tables in ahpl schema
      const tables = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'ahpl'
        ORDER BY table_name
      `);
      console.log('Tables in ahpl schema:', tables.map(t => t.table_name));
    } else {
      console.log('No active doctors found!');
      
      // Check all users to see what roles exist
      const allUsers = await prisma.$queryRawUnsafe('SELECT id, name, role, is_active FROM ahpl.users');
      console.log('All users in ahpl schema:', allUsers);
    }
    
  } catch (error) {
    console.error('Database check error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDoctorsAndAvailability();
