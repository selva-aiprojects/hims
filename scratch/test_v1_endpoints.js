require('dotenv').config();
const axios = require('axios');

async function testV1() {
  console.log('--- Probing ABDM V1 Endpoints ---');
  const gatewayUrl = process.env.ABDM_GATEWAY_URL || 'https://dev.abdm.gov.in/gateway';
  const clientId = process.env.ABDM_CLIENT_ID;
  const clientSecret = process.env.ABDM_CLIENT_SECRET;

  console.log('Client ID:', clientId);
  console.log('Gateway:', gatewayUrl);

  try {
    console.log('1. Fetching session token...');
    const sessionRes = await axios.post(`${gatewayUrl}/v0.5/sessions`, {
      clientId,
      clientSecret
    });
    const token = sessionRes.data.accessToken;
    console.log('Token obtained successfully.');

    console.log('\n2. Testing V1 Certificate endpoint...');
    try {
      const certRes = await axios.get(`${gatewayUrl}/v1/auth/cert`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('V1 Cert success! Response keys:', Object.keys(certRes.data));
    } catch (e) {
      console.log('V1 Cert failed:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n3. Testing V1 generateOtp with dummy Aadhaar...');
    try {
      const otpRes = await axios.post(`${gatewayUrl}/v1/registration/aadhaar/generateOtp`, {
        aadhaar: 'dummy_encrypted_value'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('V1 generateOtp response:', otpRes.data);
    } catch (e) {
      console.log('V1 generateOtp failed:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n4. Testing V3 Generate OTP with same dummy value...');
    try {
      const v3Res = await axios.post(`https://abhasbx.abdm.gov.in/abha/api/v3/enrollment/request/otp`, {
        txnId: '',
        scope: ['abha-enrol'],
        loginHint: 'aadhaar',
        loginId: 'dummy_encrypted_value',
        otpSystem: 'aadhaar'
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'REQUEST-ID': require('crypto').randomUUID(),
          TIMESTAMP: new Date().toISOString(),
          'X-CM-ID': 'sbx',
          'Content-Type': 'application/json'
        }
      });
      console.log('V3 generateOtp response:', v3Res.data);
    } catch (e) {
      console.log('V3 generateOtp failed:', e.response?.status, e.response?.data || e.message);
    }

  } catch (err) {
    console.error('Session failed:', err.response?.data || err.message);
  }
}

testV1();
