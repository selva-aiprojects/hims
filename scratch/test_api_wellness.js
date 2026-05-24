require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');

async function testApi() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'admin@wellness.com',
      password: 'Admin@123',
      facility: 'wellness_basic',
      type: 'tenant'
    });
    
    const { token, tenantId } = loginRes.data;
    console.log('Login successful! Tenant:', tenantId);
    
    console.log('Fetching stats...');
    const statsRes = await axios.get('http://localhost:4000/api/hospital/metrics/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    console.log('Stats Response data:');
    console.log(JSON.stringify(statsRes.data, null, 2));

    console.log('Fetching encounters...');
    const encountersRes = await axios.get('http://localhost:4000/api/hospital/encounters?status=Active', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    console.log('Encounters Response data:');
    console.log(JSON.stringify(encountersRes.data, null, 2));

  } catch (err) {
    console.error('Error fetching API:', err.response ? err.response.data : err.message);
  }
}

testApi();
