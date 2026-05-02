const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const bcrypt = require("bcryptjs");

// --- DATABASE SELF-HEALING (Ensures Nexus Registry is up to date) ---
async function ensureNexusColumns(prisma) {
  try {
    console.log("[NEXUS] Checking Registry Schema...");
    await prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS shard_id VARCHAR(255)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255)`);
    const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM nexus.tenants`);
    console.log(`[NEXUS] Registry contains ${countRes[0].count} tenants.`);
    console.log("[NEXUS] Registry Schema is synchronized.");
  } catch (err) {
    console.warn("[NEXUS] Schema sync warning:", err.message);
  }
}

// MANDATORY: Self-healing MUST run before any routes
router.use(async (req, res, next) => {
  await ensureNexusColumns(req.prisma);
  next();
});

router.get("/tenants", async (req, res, next) => {
  try {
    const tenants = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, db_name as "dbName", shard_id as "shardId", plan, admin_email as "adminEmail"
      FROM nexus.tenants
    `);
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

router.get("/tenants/public", async (req, res, next) => {
  try {
    const tenants = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, db_name as "dbName"
      FROM nexus.tenants
    `);
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

router.get("/tenants/:id", async (req, res, next) => {
  try {
    const tenants = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, code, db_name, shard_id, plan, admin_email, created_at, background_color, text_color, hero_background_color, overall_text_color
      FROM nexus.tenants
      WHERE id = '${req.params.id}'
      LIMIT 1
    `);

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenants[0]);
  } catch (error) {
    next(error);
  }
});

router.post("/tenants", async (req, res, next) => {
  const { name, dbName, plan, contactName, contactEmail, adminEmail, adminPassword, uiSettings } = req.body;
  const normalizedDbName = (dbName || "").toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const tenantCode = normalizedDbName;
  const schemaName = normalizedDbName;
  const passwordToUse = adminPassword || "Admin@" + Math.random().toString(36).slice(-4);

  if (!name || !tenantCode || !contactName || !contactEmail || !adminEmail) {
    return res.status(400).json({ error: "Missing required tenant provisioning fields." });
  }

  try {
    const tenantId = crypto.randomUUID();

    // 1. Create Tenant in Global Registry
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO nexus.tenants (id, code, name, db_name, shard_id, plan, background_color, text_color, hero_background_color, overall_text_color, admin_email)
      VALUES (
        '${tenantId}',
        '${tenantCode}',
        '${name}',
        '${schemaName}',
        '${schemaName}',
        '${plan}',
        '${uiSettings?.backgroundColor || "#ffffff"}',
        '${uiSettings?.textColor || "#1e293b"}',
        '${uiSettings?.heroBackgroundColor || "#f8fafc"}',
        '${uiSettings?.overallTextColor || "#475569"}',
        '${adminEmail}'
      )
    `);

    // Create Contact
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO nexus.tenant_admin_contacts (id, tenant_id, contact_name, email)
      VALUES ('${crypto.randomUUID()}', '${tenantId}', '${contactName}', '${contactEmail}')
    `);

    // 2. Initialize Shard Schema (Robust Sequential Execution)
    try {
      const schemaPath = path.join(__dirname, "../../../../database/SHARD_Base_Schema.sql");
      console.log(`[PROVISIONING] Attempting to load schema from: ${schemaPath}`);

      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
      }

      const sqlContent = fs.readFileSync(schemaPath, "utf8");
      const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
      console.log(`[PROVISIONING] Found ${statements.length} SQL statements to execute.`);

      await req.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      console.log(`[PROVISIONING] Schema "${schemaName}" created or already exists.`);

      let successCount = 0;
      for (const statement of statements) {
        try {
          await req.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public; ${statement}`);
          successCount++;
        } catch (stmtErr) {
          console.error(`[PROVISIONING] Statement ${successCount + 1} FAILED:`);
          console.error(`SQL: ${statement.substring(0, 200)}...`);
          console.error(`Error: ${stmtErr.message}`);
          // We continue for now, but maybe we should stop if it's a CREATE TABLE?
        }
      }
      console.log(`[PROVISIONING] Successfully executed ${successCount}/${statements.length} statements.`);

      const loginEmail = adminEmail;
      const hashedAdminPassword = await bcrypt.hash(passwordToUse, 10);

      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".users (email, password_hash, role, name)
        VALUES ('${loginEmail}', '${hashedAdminPassword}', 'admin', '${contactName}')
      `);
      console.log(`[PROVISIONING] Admin user ${loginEmail} created in shard.`);

      if (process.env.RESEND_API_KEY) {
        const fromEmail = process.env.RESEND_FROM || "HIMS Onboarding <onboarding@cognivectra.com>";
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 20px;">
            <h2>Welcome to Healthezee HIMS</h2>
            <p>Your hospital shard <strong>${name}</strong> is ready.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
              <p><strong>Admin Email:</strong> ${loginEmail}</p>
              <p><strong>Initial Password:</strong> ${passwordToUse}</p>
              <p><strong>Tenant Code:</strong> ${tenantCode}</p>
            </div>
            <p>Please log in at: <a href="http://localhost:3000">Hospital Dashboard</a></p>
          </div>
        `;

        try {
          await axios.post('https://api.resend.com/emails', {
            from: fromEmail,
            to: [contactEmail],
            subject: `HIMS Shard Ready: ${name}`,
            html: emailHtml
          }, {
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }
          });
          console.log(`[COMMUNICATION] Welcome email sent to ${contactEmail}`);
        } catch (emailErr) {
          console.error("[COMMUNICATION] Email failed:", emailErr.response?.data || emailErr.message);
        }
      }
    } catch (shardErr) {
      console.error("[PROVISIONING] Critical failure in shard init:", shardErr.message);
      await req.prisma.$executeRawUnsafe(`DELETE FROM nexus.tenant_admin_contacts WHERE tenant_id = '${tenantId}'`);
      await req.prisma.$executeRawUnsafe(`DELETE FROM nexus.tenants WHERE id = '${tenantId}'`);
      return next(shardErr);
    }

    res.status(201).json({ id: tenantId, name, dbName: schemaName, plan, adminEmail });
  } catch (error) {
    console.error("[NEXUS] CRITICAL PROVISIONING ERROR:", error.message);
    if (error.code === 'P2002') {
       console.error("[NEXUS] ERROR: A tenant with this slug or email already exists in the registry.");
    }
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const users = await req.prisma.user.findMany({ where: { role: "nexus" } });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.patch("/tenants/:id/password", async (req, res, next) => {
  const { id } = req.params;
  const { newPassword, adminEmail } = req.body;

  if (!newPassword || !adminEmail) {
    return res.status(400).json({ error: "newPassword and adminEmail are required." });
  }

  try {
    const tenants = await req.prisma.$queryRawUnsafe(`
      SELECT db_name FROM nexus.tenants WHERE id = '${id}' LIMIT 1
    `);

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const schemaName = tenants[0].db_name;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${schemaName}".users
      SET password_hash = '${hashedPassword}'
      WHERE LOWER(email) = LOWER('${adminEmail}')
    `);

    res.json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/tenants/:id", async (req, res, next) => {
  const { id } = req.params;

  try {
    const tenants = await req.prisma.$queryRawUnsafe(`
      SELECT db_name FROM nexus.tenants WHERE id = '${id}' LIMIT 1
    `);

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const schemaName = tenants[0].db_name;
    await req.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await req.prisma.$executeRawUnsafe(`DELETE FROM nexus.tenant_admin_contacts WHERE tenant_id = '${id}'`);
    await req.prisma.$executeRawUnsafe(`DELETE FROM nexus.tenants WHERE id = '${id}'`);

    res.json({ message: "Tenant deleted and shard decommissioned" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
