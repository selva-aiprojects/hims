const express = require('express');
const router = express.Router();
const abhaService = require('./abha.service');

// GET /api/abha/config — returns whether ABHA is mandatory for this facility
router.get('/config', (req, res) => {
  res.json({
    isAbhaMandatory: process.env.ABHA_MANDATORY === 'true',
    isDemoMode: abhaService.isDemoMode
  });
});

// POST /api/abha/generate-otp — starts Aadhaar OTP flow
router.post('/generate-otp', async (req, res, next) => {
  try {
    const { aadhaar } = req.body;
    if (!aadhaar) return res.status(400).json({ error: 'Aadhaar number is required' });
    if (!/^\d{12}$/.test(String(aadhaar).trim())) {
      return res.status(400).json({ error: 'Aadhaar must be a 12-digit number' });
    }

    const result = await abhaService.generateAadhaarOtp(String(aadhaar).trim());
    res.json(result);
  } catch (err) {
    // Return 422 for ABDM validation errors (not server errors)
    const isAbdmError = err.message && !err.message.includes('connect') && !err.message.includes('ENOTFOUND');
    res.status(isAbdmError ? 422 : 500).json({ error: err.message || 'OTP generation failed' });
  }
});

// POST /api/abha/verify-otp — verifies OTP and returns ABHA profile
router.post('/verify-otp', async (req, res) => {
  try {
    const { otp, txnId, mobile } = req.body;
    if (!otp || !txnId) return res.status(400).json({ error: 'OTP and txnId are required' });

    const profile = await abhaService.verifyAadhaarOtp(
      String(otp).trim(),
      txnId,
      mobile ? String(mobile).trim() : undefined
    );
    res.json(profile);
  } catch (err) {
    const isAbdmError = err.message && !err.message.includes('connect') && !err.message.includes('ENOTFOUND');
    res.status(isAbdmError ? 422 : 500).json({ error: err.message || 'OTP verification failed' });
  }
});

// POST /api/abha/search-mobile — discovers existing ABHA by mobile number
router.post('/search-mobile', async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });

    const result = await abhaService.searchByMobile(String(mobile).trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Mobile search failed' });
  }
});

module.exports = router;
