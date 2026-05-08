const axios = require('axios');

async function testDoctorsAPI() {
  try {
    console.log('Testing doctors API...');
    
    const response = await axios.get('http://localhost:4000/api/hospital/doctors', {
      headers: {
        'x-tenant-id': '71820db3-f8f1-4294-8c11-1dc66ab1056e',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    console.log('Number of doctors:', response.data?.length || 0);
    
  } catch (error) {
    console.error('API test error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDoctorsAPI();
