require('dotenv').config();
const axios = require('axios');

async function sendTestEmail(toEmail) {
  try {
    const res = await axios.post('https://api.resend.com/emails', {
      from: process.env.RESEND_FROM || "HIMS <onboarding@cognivectra.com>",
      to: [toEmail],
      subject: "HIMS Communication Engine Test",
      html: `
        <div style="font-family: sans-serif; padding: 40px; border: 1px solid #e2e8f0; border-radius: 20px; max-width: 600px; margin: auto;">
          <h2 style="color: #3b82f6; margin-top: 0;">Signal Connection Successful</h2>
          <p style="font-size: 16px; color: #1e293b;">This is a manual test of the <strong>HIMS Communication Engine</strong>.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
             <p style="margin: 0; font-size: 14px; color: #64748b;">If you are reading this, your Resend API integration is fully operational and authenticated.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Generated on: ${new Date().toLocaleString()}</p>
        </div>
      `
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json' 
      }
    });
    console.log("\n✅ Email Sent Successfully!");
    console.log("ID:", res.data.id);
  } catch (err) {
    console.error("\n❌ Email Failed!");
    console.error("Error:", err.response?.data || err.message);
  }
}

// Extract email from command line or use a default for testing
const targetEmail = process.argv[2] || 'admin@hims-sys.com';
console.log(`\n--- Triggering Test Email to: ${targetEmail} ---`);
sendTestEmail(targetEmail);
