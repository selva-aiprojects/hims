const express = require('express');
const router = express.Router();
const abhaService = require('./abha.service');

router.get('/config', (req, res) => {
  res.json({
    isAbhaMandatory: process.env.ABHA_MANDATORY === 'true'
  });
});

router.post('/generate-otp', async (req, res, next) => {
  try {
    const { aadhaar } = req.body;
    if (!aadhaar) return res.status(400).json({ error: 'Aadhaar number is required' });
    
    const result = await abhaService.generateAadhaarOtp(aadhaar);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/search-mobile', async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });
    const result = await abhaService.searchByMobile(mobile);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { otp, txnId } = req.body;
    if (!otp || !txnId) return res.status(400).json({ error: 'OTP and txnId are required' });
    
    const profile = await abhaService.verifyAadhaarOtp(otp, txnId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
