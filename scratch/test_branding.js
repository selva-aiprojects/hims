const axios = require('axios');

const API_BASE = 'http://localhost:4000'; // Adjust as needed
const tenantId = '66624976-90e6-4d92-9659-33ca07300720'; // From verify_hospital.js

async function testBrandingUpdate() {
  try {
    const res = await axios.put(`${API_BASE}/api/nexus/tenants/${tenantId}/branding`, {
      hospitalName: 'Apollo Hospitals Updated',
      primaryDark: '#1e293b',
      primaryAccent: '#0ea5e9'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testBrandingUpdate();
