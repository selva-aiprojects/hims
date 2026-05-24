require('dotenv').config();
const axios = require('axios');
const abhaService = require('../backend/src/modules/abha/abha.service');

async function testSingle() {
  console.log('--- Probing Case 3 only ---');
  abhaService.isDemoMode = false;
  const token = await abhaService.getSessionToken();
  const publicKey = await abhaService.fetchCert();
  const encryptedOtp = await abhaService.encrypt('123456', publicKey);
  const encryptedMobile = await abhaService.encrypt('9876543210', publicKey);
  const headers = abhaService._buildAbhaHeaders(token);

  try {
    const res = await axios.post(
      `${abhaService.abhaApiUrl}/v3/enrollment/enrol/byAadhaar`,
      {
        authData: {
          authMethods: ['otp'],
          otp: {
            txnId: '12345678-1234-1234-1234-123456789012',
            otpValue: encryptedOtp,
            mobile: encryptedMobile
          }
        },
        consent: {
          code: 'abha-enrollment',
          version: '1.4'
        }
      },
      { headers }
    );
    console.log('Success:', res.status, res.data);
  } catch (e) {
    console.log('Error Status:', e.response?.status);
    console.log('Error Data:', JSON.stringify(e.response?.data));
    console.log('Error Message:', e.message);
  }
}

testSingle();
