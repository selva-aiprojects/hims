const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('http://localhost:4000/api/health-db');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error fetching health-db:', error.message);
  }
}

test();
