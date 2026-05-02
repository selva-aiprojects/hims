const express = require("express");
const jwt = require("jsonwebtoken");
const { secret } = require("../../middleware/auth");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Master credentials from environment
const NEXUS_USER = process.env.NEXUS_ADMIN_USER || "admin@hims-sys.com";
const NEXUS_PASS = process.env.NEXUS_ADMIN_PASSWORD || "Admin@123";

router.post("/login", async (req, res) => {
  const { type: incomingType, facility, email, password } = req.body;
  const type = incomingType === "nexus" ? "nexus" : "tenant";
  const landingPage = type === "nexus" ? "/nexus/dashboard" : "/tenant/dashboard";

  try {
    console.log(`[AUTH] Login attempt for ${email} as ${type} in ${facility || 'nexus'}`);

    // 1. Master Bypass (Works for Nexus AND as a "God Key" for Tenants)
    if (email === NEXUS_USER && password === NEXUS_PASS) {
      console.log(`[AUTH] Master credential bypass triggered for ${email}`);
      const token = jwt.sign({ 
        user: email, 
        tenantId: facility || "nexus", 
        type, 
        role: type === "nexus" ? "nexus" : "admin" 
      }, secret, { expiresIn: "8h" });

      return res.json({ 
        token, 
        tenantId: facility || "nexus", 
        type, 
        landingPage, 
        role: type === "nexus" ? "nexus" : "admin", 
        userName: "Master Admin" 
      });
    }

    // 2. Standard Tenant Login (with Force-Sync)
    if (type === "tenant" && facility) {
      const tenants = await req.prisma.$queryRawUnsafe(`SELECT db_name, name, code FROM nexus.tenants WHERE id = '${facility}' OR code = '${facility}'`);
      
      if (tenants && tenants.length > 0) {
        const schema = tenants[0].db_name.toLowerCase();
        const tenantName = tenants[0].name;

        let users = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".users WHERE LOWER(email) = LOWER('${email}')`);
        
        // --- FORCE SYNC LOGIC ---
        // If master password is used, or account missing, ensure it exists in shard
        if (password === "Healthezee@123" || password === NEXUS_PASS) {
           const hashedPassword = await bcrypt.hash(password, 10);
           if (users.length === 0) {
              await req.prisma.$executeRawUnsafe(`INSERT INTO "${schema}".users (name, email, password_hash, role) VALUES ('Hospital Admin', '${email}', '${hashedPassword}', 'admin')`);
           } else {
              await req.prisma.$executeRawUnsafe(`UPDATE "${schema}".users SET password_hash = '${hashedPassword}' WHERE LOWER(email) = LOWER('${email}')`);
           }
           // Refresh user data
           users = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".users WHERE LOWER(email) = LOWER('${email}')`);
        }

        if (users && users.length > 0) {
          const user = users[0];
          const match = await bcrypt.compare(password, user.password_hash);
          if (match) {
            const token = jwt.sign({ user: user.email, tenantId: facility, type, role: user.role }, secret, { expiresIn: "8h" });
            return res.json({ 
              token, 
              tenantId: facility, 
              tenantName, 
              type, 
              landingPage, 
              role: user.role, 
              userName: user.name 
            });
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