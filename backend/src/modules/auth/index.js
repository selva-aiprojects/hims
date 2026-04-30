const express = require("express");
const jwt = require("jsonwebtoken");
const { secret } = require("../../middleware/auth");

const router = express.Router();

// Fallback credentials from environment
const NEXUS_USER = process.env.NEXUS_ADMIN_USER || "admin@hmis-sys.com";
const NEXUS_PASS = process.env.NEXUS_ADMIN_PASSWORD || "Admin@123";

router.post("/login", async (req, res) => {
  const { facilityType, facility, email, password } = req.body;
  const type = facilityType === "nexus" ? "nexus" : "tenant";
  const tenantId = type === "nexus" ? "nexus" : facility || "tenant1";
  const landingPage = type === "nexus" ? "/nexus/dashboard" : "/tenant/dashboard";

  // 1. Check for Nexus Hardcoded Fallback
  if (type === "nexus" && email === NEXUS_USER && password === NEXUS_PASS) {
      const token = jwt.sign({ user: email, tenantId, type }, secret, { expiresIn: "8h" });
      return res.json({ token, tenantId, type, landingPage });
  }

  // 2. Check Database (Placeholder for other users)
  // In a real app, we'd query req.prisma.user.findFirst(...)
  // For now, we allow the demo admin password if it matches the hardcoded one or 'password'
  if (email === "admin@ehs.com" && password === "password") {
      const token = jwt.sign({ user: email, tenantId, type }, secret, { expiresIn: "8h" });
      return res.json({ token, tenantId, type, landingPage });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

router.get("/me", (req, res) => {
  res.json({ user: req.user || null });
});

module.exports = router;