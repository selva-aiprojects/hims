const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { auth } = require("../../middleware/auth");
const router = express.Router();

// --- Public Access ---
// Used by login screen to list hospitals
router.get("/tenants/public", async (req, res, next) => {
  try {
    const tenants = await req.prisma.$queryRawUnsafe(`SELECT id, name FROM nexus.tenants`);
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

// --- Protected Nexus Operations ---
router.use(auth); // Protect all routes below

router.get("/tenants", async (req, res, next) => {
  try {
    // Ensure columns and constraints exist (Auto-migration)
    try {
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code TEXT`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS db_name TEXT`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_pwd TEXT`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#ffffff'`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#1e293b'`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_background_color TEXT DEFAULT '#f8fafc'`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS overall_text_color TEXT DEFAULT '#475569'`);
      
      // Update check constraint for plans
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_check`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE tenants ADD CONSTRAINT tenants_plan_check CHECK (plan IN ('Basic', 'Standard', 'Professional', 'Enterprise'))`);
    } catch (e) {
      console.warn("[PROVISIONING] Migration warning:", e.message);
    }

    const tenants = await req.prisma.$queryRawUnsafe(`SELECT * FROM nexus.tenants ORDER BY created_at DESC`);
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

router.post("/tenants", async (req, res, next) => {
  try {
    const { name, dbName, plan, contactName, contactEmail, adminEmail, adminPassword, uiSettings } = req.body;
    console.log(`[PROVISIONING] Starting provisioning for: ${name} (${dbName})`);

    // --- TOTAL RECOVERY MIGRATION ---
    try {
      console.log(`[PROVISIONING] Initializing database structure in nexus schema...`);
      
      // 1. Ensure Tables Exist
      await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS nexus.tenants (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL)`);
      await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS nexus.tenant_admin_contacts (id TEXT PRIMARY KEY, tenant_id TEXT)`);

      // 2. Force Add Missing Columns
      const columns = [
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS db_name TEXT",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS code TEXT",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS plan TEXT",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS default_pwd TEXT",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#ffffff'",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#1e293b'",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS hero_background_color TEXT DEFAULT '#f8fafc'",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS overall_text_color TEXT DEFAULT '#475569'",
        "ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
      ];

      for (const cmd of columns) {
        try { await req.prisma.$executeRawUnsafe(cmd); } catch (e) {}
      }

      await req.prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check`);
    } catch (e) {
      console.warn("[PROVISIONING] Recovery migration warning:", e.message);
    }

    // 0. Check if tenant already exists
    console.log(`[PROVISIONING] Checking if tenant ${name} or ${dbName} exists...`);
    const existing = await req.prisma.tenant.findFirst({
      where: {
        OR: [
          { name: { equals: name } },
          { dbName: { equals: dbName } }
        ]
      },
      select: { id: true, name: true, dbName: true }
    });
    
    if (existing) {
      return res.status(400).json({ error: "Tenant Name or Code already exists." });
    }

    // 1. Create Tenant in Nexus (Using Raw SQL to bypass stale Prisma Client)
    const tenantId = crypto.randomUUID();
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO nexus.tenants (id, name, db_name, code, plan, background_color, text_color, hero_background_color, overall_text_color)
      VALUES (
        '${tenantId}', 
        '${name}', 
        '${dbName}', 
        '${dbName}', 
        '${plan}', 
        '${uiSettings?.backgroundColor || "#ffffff"}', 
        '${uiSettings?.textColor || "#1e293b"}', 
        '${uiSettings?.heroBackgroundColor || "#f8fafc"}', 
        '${uiSettings?.overallTextColor || "#475569"}'
      )
    `);

    // Create Contact
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO nexus.tenant_admin_contacts (id, tenant_id, contact_name, email)
      VALUES ('${crypto.randomUUID()}', '${tenantId}', '${contactName}', '${contactEmail}')
    `);

    // 2. Initialize Shard Schema
    try {
      const schemaName = dbName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      console.log(`[PROVISIONING] Initializing isolated shard: ${schemaName}...`);
      
      // Load base schema SQL
      const schemaPath = path.join(__dirname, "../../../../database/SHARD_Base_Schema.sql");
      const sql = fs.readFileSync(schemaPath, "utf8");
      
      const passwordToUse = adminPassword || "Admin@" + Math.random().toString(36).slice(-4);
      const loginEmail = adminEmail || contactEmail;

      // EXECUTE ALL IN ONE ATOMIC CALL TO PREVENT POOLER CONTEXT LOSS
      await req.prisma.$executeRawUnsafe(`
        CREATE SCHEMA IF NOT EXISTS "${schemaName}";
        SET search_path TO "${schemaName}", public;
        ${sql};
        INSERT INTO users (email, password_hash, role, name)
        VALUES ('${loginEmail}', '${passwordToUse}', 'admin', '${contactName}');
      `);

      // 4. Communicate Credentials via Resend
      const emailHtml = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; color: #1e293b;">
          <div style="text-align: center; marginBottom: 32px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px;">Welcome to HIMS</h1>
            <p style="color: #64748b; margin-top: 8px;">Your Enterprise Healthcare Workspace is Ready</p>
          </div>
          
          <p>Hello <strong>${contactName}</strong>,</p>
          <p>We are excited to inform you that <strong>${name}</strong> has been successfully provisioned on the HIMS platform. Your isolated cloud instance is now active and ready for configuration.</p>
          
          <div style="background: #f8fafc; padding: 32px; border-radius: 16px; margin: 32px 0; border: 1px solid #f1f5f9;">
            <h3 style="margin-top: 0; font-size: 16px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">Access Credentials</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Portal URL</td>
                <td style="padding: 8px 0; text-align: right;"><a href="http://localhost:3000/login" style="color: #6366f1; text-decoration: none; font-weight: 600;">Open Dashboard</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Admin Email</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${contactEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Password</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px;">${passwordToUse}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Tenant Code</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;"><code>${dbName}</code></td>
              </tr>
            </table>
          </div>

          <div style="background: #eff6ff; padding: 16px; border-radius: 12px; border-left: 4px solid #3b82f6; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 13px; color: #1e40af;">
              <strong>Security Tip:</strong> Please change your password immediately after your first login to ensure account security.
            </p>
          </div>

          <p style="font-size: 14px; color: #64748b;">Best Regards,<br/>The HIMS Nexus Team</p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">This is an automated provisioning notification. Please do not reply directly to this email.</p>
        </div>
      `;

      if (process.env.RESEND_API_KEY) {
        try {
          await axios.post('https://api.resend.com/emails', {
            from: 'HIMS Onboarding <onboarding@resend.dev>',
            to: contactEmail,
            subject: `Welcome to HIMS - ${name} Instance Provisioned`,
            html: emailHtml,
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            }
          });
          console.log(`[COMMUNICATION] Formal welcome email sent to ${contactEmail}`);
        } catch (emailError) {
          console.error("[COMMUNICATION] Failed to send email via Resend:", emailError.response?.data || emailError.message);
        }
      } else {
        console.log(`[COMMUNICATION] No RESEND_API_KEY. Credentials for ${name}: ${contactEmail} / ${passwordToUse}`);
      }

    } catch (schemaError) {
      console.error("Critical failure during shard initialization:", schemaError);
    }

    res.status(201).json({ id: tenantId, name, dbName, plan });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const users = await req.prisma.user.findMany({
      where: { role: "nexus" }
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// --- Tenant Management Operations ---

// 1. Get Single Tenant
router.get("/tenants/:id", async (req, res, next) => {
  try {
    const tenants = await req.prisma.$queryRawUnsafe(`SELECT * FROM nexus.tenants WHERE id = '${req.params.id}'`);
    if (!tenants || tenants.length === 0) return res.status(404).json({ error: "Tenant not found" });
    res.json(tenants[0]);
  } catch (error) {
    next(error);
  }
});

// 2. Reset Admin Password
router.patch("/tenants/:id/password", async (req, res, next) => {
  try {
    const { newPassword, adminEmail } = req.body;
    const tenants = await req.prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants WHERE id = '${req.params.id}'`);
    if (!tenants || tenants.length === 0) return res.status(404).json({ error: "Tenant not found" });
    
    const schemaName = tenants[0].db_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Update password in the shard's users table
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".users 
      SET password_hash = '${newPassword}' 
      WHERE email = '${adminEmail}'
    `);
    
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

// 3. Upgrade Plan
router.patch("/tenants/:id/plan", async (req, res, next) => {
  try {
    const { plan } = req.body;
    await req.prisma.$executeRawUnsafe(`
      UPDATE nexus.tenants 
      SET plan = '${plan}' 
      WHERE id = '${req.params.id}'
    `);
    res.json({ message: "Plan upgraded successfully" });
  } catch (error) {
    next(error);
  }
});

// 4. Delete Tenant (Decommission)
router.delete("/tenants/:id", async (req, res, next) => {
  try {
    const tenants = await req.prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants WHERE id = '${req.params.id}'`);
    if (!tenants || tenants.length === 0) return res.status(404).json({ error: "Tenant not found" });
    
    const schemaName = tenants[0].db_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Drop Schema
    await req.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    
    // Delete Records
    await req.prisma.$executeRawUnsafe(`DELETE FROM nexus.tenant_admin_contacts WHERE tenant_id = '${req.params.id}'`);
    await req.prisma.$executeRawUnsafe(`DELETE FROM nexus.tenants WHERE id = '${req.params.id}'`);
    
    res.json({ message: "Tenant decommissioned successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
