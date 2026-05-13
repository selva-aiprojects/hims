const axios = require('axios');
const crypto = require('crypto');

class ABHAService {
  constructor() {
    this.gatewayUrl = process.env.ABDM_GATEWAY_URL || 'https://dev.abdm.gov.in/gateway';
    this.clientId = process.env.ABDM_CLIENT_ID;
    this.clientSecret = process.env.ABDM_CLIENT_SECRET;
    this.token = null;
    this.tokenExpiry = null;
    // Auto-detect Demo Mode if credentials are placeholders or if flag is set
    this.isDemoMode = process.env.ABHA_DEMO_MODE === 'true' || 
                      !this.clientId || 
                      this.clientId.includes('000123') || 
                      this.clientSecret.includes('xxxx');
    
    if (this.isDemoMode) {
      console.log('----------------------------------------------------');
      console.log('[ABHA SERVICE] RUNNING IN DEMO / SIMULATION MODE');
      console.log('[ABHA SERVICE] Mock data will be returned for testing');
      console.log('----------------------------------------------------');
    }
  }

  async getSessionToken() {
    if (this.isDemoMode) return "demo-token-123";
    
    if (this.token && this.tokenExpiry > Date.now()) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.gatewayUrl}/v0.5/sessions`, {
        clientId: this.clientId,
        clientSecret: this.clientSecret
      });
      this.token = response.data.accessToken;
      this.tokenExpiry = Date.now() + (response.data.expiresIn * 1000) - 60000;
      return this.token;
    } catch (error) {
      console.error('ABDM Session Error:', error.response?.data || error.message);
      throw new Error('Could not connect to ABDM Gateway. Check credentials in .env');
    }
  }

  async encrypt(data, publicKeyPem) {
    if (this.isDemoMode) return data; // No encryption in demo mode
    try {
      const buffer = Buffer.from(data);
      const encrypted = crypto.publicEncrypt({
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      }, buffer);
      return encrypted.toString('base64');
    } catch (err) {
      console.error('Encryption Error:', err.message);
      throw new Error('Encryption failed');
    }
  }

  async fetchCert() {
    if (this.isDemoMode) return "demo-cert";
    const token = await this.getSessionToken();
    const response = await axios.get(`${this.gatewayUrl}/v2/auth/cert`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async generateAadhaarOtp(aadhaarNumber) {
    if (this.isDemoMode) {
      console.log(`[ABHA DEMO] Generating OTP for ${aadhaarNumber}`);
      return { txnId: "demo-txn-" + Date.now() };
    }
    const token = await this.getSessionToken();
    const cert = await this.fetchCert();
    const encryptedAadhaar = await this.encrypt(aadhaarNumber, cert);

    const response = await axios.post(`${this.gatewayUrl}/v1/registration/aadhaar/generateOtp`, {
      aadhaar: encryptedAadhaar
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  // Enterprise Flow: Discovery by Mobile
  async searchByMobile(mobile) {
    if (this.isDemoMode) {
      console.log(`[ABHA DEMO] Searching for ABHA by mobile: ${mobile}`);
      if (mobile.startsWith('9')) {
        return { 
          healthIds: [
            { healthIdNumber: "91-1234-5678-9012", name: "Selvakumar Balakrishnan", healthId: "selvakumar@abha" }
          ] 
        };
      }
      return { healthIds: [] };
    }
    
    const token = await this.getSessionToken();
    const response = await axios.post(`${this.gatewayUrl}/v1/forgot/healthId/mobile/generateOtp`, {
      mobile: mobile
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async verifyAadhaarOtp(otp, txnId) {
    if (this.isDemoMode) {
      console.log(`[ABHA DEMO] Verifying OTP ${otp} for txn ${txnId}`);
      // Return a professional mock profile for the demo
      return {
        healthIdNumber: "91-1234-5678-9012",
        healthId: "selvakumar@abha",
        name: "Selvakumar Balakrishnan",
        gender: "M",
        dayOfBirth: "15",
        monthOfBirth: "06",
        yearOfBirth: "1985",
        address: "123, Apollo Greams Road, Chennai, Tamil Nadu",
        stateName: "Tamil Nadu",
        districtName: "Chennai"
      };
    }
    const token = await this.getSessionToken();
    const cert = await this.fetchCert();
    const encryptedOtp = await this.encrypt(otp, cert);

    const response = await axios.post(`${this.gatewayUrl}/v1/registration/aadhaar/verifyOTP`, {
      otp: encryptedOtp,
      txnId: txnId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
}

module.exports = new ABHAService();
