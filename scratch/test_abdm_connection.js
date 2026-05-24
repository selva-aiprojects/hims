require('dotenv').config();
const axios = require('axios');
const abhaService = require('../backend/src/modules/abha/abha.service');

async function testABDM() {
  console.log('--- ABDM Gateway Connection Validation ---');
  console.log(`Gateway URL: ${abhaService.gatewayUrl}`);
  console.log(`Client ID  : ${abhaService.clientId}`);
  
  abhaService.isDemoMode = false;

  let token;
  try {
    console.log('\n1. Requesting session token from ABDM Gateway...');
    token = await abhaService.getSessionToken();
    console.log('   SUCCESS! Session token retrieved:');
    console.log(`   ${token.substring(0, 20)}... (length: ${token.length})`);
  } catch (error) {
    console.error('   FAILURE: Could not retrieve session token!');
    console.error(error.message);
    return;
  }

  // The ABDM Sandbox cert endpoint — discovered via their swagger collections
  const certEndpoints = [
    // ABHA creation v3 APIs
    `https://abhasbx.abdm.gov.in/v3/profile/public/certificate`,
    `https://abhasbx.abdm.gov.in/v2/profile/public/certificate`,
    `https://abhasbx.abdm.gov.in/v1/auth/cert`,
    // Health ID / legacy paths (commonly listed in many working integrations)
    `https://healthidsbx.ndhm.gov.in/api/v2/auth/cert`,
    `https://healthidsbx.ndhm.gov.in/api/v1/auth/cert`,
    // NDHM legacy
    `https://healthidsbx.ndhm.gov.in/api/v3/auth/cert`
  ];

  console.log('\n2. Testing Certificate Endpoints...');
  for (const url of certEndpoints) {
    try {
      console.log(`   Trying: ${url}`);
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      });
      console.log(`   --> SUCCESS!`);
      const certData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      console.log(`       First 200 chars: ${certData.substring(0, 200)}`);
      console.log(`\n   ✅ Working cert endpoint: ${url}`);
      return;
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.code || error.message;
      console.warn(`   --> FAILED (${status || '?'}): ${msg}`);
    }
  }
  
  console.error('\n❌ ALL certificate endpoints failed!');
  console.log('\nDIAGNOSTIC: The session token works, but the cert endpoint is blocked or wrong.');
  console.log('Recommendation: Visit https://sandbox.abdm.gov.in and check the API collection for the correct cert URL.');
}

testABDM();
