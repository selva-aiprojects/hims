require('dotenv').config();
const axios = require('axios');
const abhaService = require('../backend/src/modules/abha/abha.service');

async function testValidation() {
  console.log('--- Probing enrol/byAadhaar validation in ABDM Sandbox V3 ---');
  abhaService.isDemoMode = false;

  try {
    const token = await abhaService.getSessionToken();
    const publicKey = await abhaService.fetchCert();

    // Encrypt some dummy values
    const encryptedOtp = await abhaService.encrypt('123456', publicKey);
    const encryptedMobile = await abhaService.encrypt('9876543210', publicKey);

    const headers = abhaService._buildAbhaHeaders(token);

    // Case 1: No mobile field in payload
    console.log('\nCase 1: Omitting "mobile" field...');
    try {
      const res1 = await axios.post(
        `${abhaService.abhaApiUrl}/v3/enrollment/enrol/byAadhaar`,
        {
          authData: {
            authMethods: ['otp'],
            otp: {
              txnId: '12345678-1234-1234-1234-123456789012',
              otpValue: encryptedOtp
            }
          },
          consent: {
            code: 'abha-enrollment',
            version: '1.4'
          }
        },
        { headers }
      );
      console.log('Case 1 Response:', res1.data);
    } catch (e) {
      console.log('Case 1 Error response:', e.response?.status, JSON.stringify(e.response?.data));
    }

    // Case 2: Unencrypted mobile field
    console.log('\nCase 2: Sending unencrypted "mobile" field...');
    try {
      const res2 = await axios.post(
        `${abhaService.abhaApiUrl}/v3/enrollment/enrol/byAadhaar`,
        {
          authData: {
            authMethods: ['otp'],
            otp: {
              txnId: '12345678-1234-1234-1234-123456789012',
              otpValue: encryptedOtp,
              mobile: '9876543210'
            }
          },
          consent: {
            code: 'abha-enrollment',
            version: '1.4'
          }
        },
        { headers }
      );
      console.log('Case 2 Response:', res2.data);
    } catch (e) {
      console.log('Case 2 Error response:', e.response?.status, JSON.stringify(e.response?.data));
    }

    // Case 3: Encrypted mobile field
    console.log('\nCase 3: Sending encrypted "mobile" field...');
    try {
      const res3 = await axios.post(
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
      console.log('Case 3 Response:', res3.data);
    } catch (e) {
      console.log('Case 3 Error response:', e.response?.status, JSON.stringify(e.response?.data));
    }

  } catch (err) {
    console.error('Test script execution failed:', err.message);
  }
}

testValidation();
