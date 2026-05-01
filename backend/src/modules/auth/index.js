const express = require("express");
const jwt = require("jsonwebtoken");
const { secret } = require("../../middleware/auth");

const router = express.Router();

// Fallback credentials from environment
const NEXUS_USER = process.env.NEXUS_ADMIN_USER || "admin@hmis-sys.com";
const NEXUS_PASS = process.env.NEXUS_ADMIN_PASSWORD || "Admin@123";

router.post("/login", async (req, res) => {
  const { type: incomingType, facility, email, password } = req.body;
  const bcrypt = require("bcryptjs");
  const type = incomingType === "nexus" ? "nexus" : "tenant";
  const landingPage = type === "nexus" ? "/nexus/dashboard" : "/tenant/dashboard";

  try {
    // 1. Check for Nexus Hardcoded Fallback
    if (type === "nexus" && email === NEXUS_USER && password === NEXUS_PASS) {
        const token = jwt.sign({ user: email, tenantId: "nexus", type, role: "nexus" }, secret, { expiresIn: "8h" });
        return res.json({ token, tenantId: "nexus", type, landingPage, role: "nexus", userName: "Nexus SuperAdmin" });
    }

    // 2. Tenant Login (Shard-Aware)
    if (type === "tenant" && facility) {
      const tenants = await req.prisma.$queryRawUnsafe(`SELECT db_name, name FROM nexus.tenants WHERE id = '${facility}'`);
      if (tenants && tenants.length > 0) {
        const schema = tenants[0].db_name.toLowerCase();
        const tenantName = tenants[0].name;
        const users = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".users WHERE LOWER(email) = LOWER('${email}')`);
        
        if (users && users.length > 0) {
          const user = users[0];
          const match = await bcrypt.compare(password, user.password_hash);
          if (match) {
            const token = jwt.sign({ user: user.email, tenantId: facility, type, role: user.role }, secret, { expiresIn: "8h" });
            return res.json({ token, tenantId: facility, tenantName, type, landingPage, role: user.role, userName: user.name });
          }
        }
      }
    }

    return res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    console.error("[AUTH] Login error:", err.message);
    res.status(500).json({ error: "Authentication service unavailable" });
  }
});

router.get("/me", (req, res) => {
  res.json({ user: req.user || null });
});

module.exports = router;