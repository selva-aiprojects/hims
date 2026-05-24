const axios = require('axios');
require('dotenv').config();
const { getPrisma } = require('../src/config/prisma');
const prisma = getPrisma();

async function main() {
  try {
    // Query tenant code
    const tenants = await prisma.$queryRawUnsafe(`SELECT id, code, db_name, plan FROM nexus.tenants`);
    console.log('Available tenants in nexus.tenants:', tenants);

    const wellnessBasicTenant = tenants.find(t => t.db_name.toLowerCase() === 'wellness_basic');
    if (!wellnessBasicTenant) {
      console.error('wellness_basic tenant not found in nexus.tenants!');
      return;
    }
    
    console.log('Logging in to wellness_basic tenant:', wellnessBasicTenant);
    // Standard login request
    const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'admin@wellness.com',
      password: 'Admin@123',
      type: 'tenant',
      facility: wellnessBasicTenant.code
    });

    console.log('Login Response:', loginRes.data);
    const { token, tenantId } = loginRes.data;

    // Fetch stats
    console.log('Fetching stats with token & x-tenant-id:', tenantId);
    const statsRes = await axios.get('http://localhost:4000/api/hospital/metrics/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });

    console.log('Stats Response todayAppointments:', statsRes.data.todayAppointments);
    console.log('Stats Response metrics:', statsRes.data.metrics);
    console.log('Stats Response patientGenderStats:', statsRes.data.patientGenderStats);

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
