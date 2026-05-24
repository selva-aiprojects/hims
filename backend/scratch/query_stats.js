const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('http://localhost:4000/api/hospital/metrics/stats', {
      headers: {
        'x-tenant-id': 'wellness_basic'
      }
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    if (error.response) {
      console.error(error.response.data);
    }
  }
}

test();
