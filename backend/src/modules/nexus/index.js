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
    await prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS ui_settings JSONB DEFAULT '{}'::jsonb`);
    
    // Support Ticketing Infrastructure
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS nexus.support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255), -- Use VARCHAR to match either UUID or String IDs from Prisma
        subject VARCHAR(255),
        category VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(20) DEFAULT 'Open',
        message TEXT,
        response TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Communication Logs Infrastructure
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS nexus.communication_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255),
        subject VARCHAR(255),
        recipient VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM nexus.tenants`);
    console.log(`[NEXUS] Registry contains ${countRes[0].count} tenants.`);
    console.log("[NEXUS] Registry Schema is synchronized.");
  } catch (err) {
    console.warn("[NEXUS] Schema sync warning:", err.message);
  }
}

// Only run self-healing in development or if forced
router.use(async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' || process.env.FORCE_SYNC === 'true') {
    await ensureNexusColumns(req.prisma);
  }
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

router.get("/communications", async (req, res, next) => {
  try {
    const logs = await req.prisma.$queryRawUnsafe(`
      SELECT l.*, t.name as tenant_name 
      FROM nexus.communication_logs l
      LEFT JOIN nexus.tenants t ON l.tenant_id = t.id
      ORDER BY l.created_at DESC
    `);
    res.json(logs);
  } catch (err) {
    next(err);
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

router.put("/tenants/:id/branding", async (req, res, next) => {
  try {
    const { id } = req.params;
    const settings = req.body;
    
    // Fallback safe strings
    const safeName = (settings.hospitalName || "Healthezee Hospital").replace(/'/g, "''");
    
    await req.prisma.$executeRawUnsafe(`
      UPDATE nexus.tenants 
      SET ui_settings = '${JSON.stringify(settings)}'::jsonb, name = '${safeName}'
      WHERE id = '${id}'
    `);
    res.json({ message: "Branding updated successfully in global registry" });
  } catch (error) { next(error); }
});

router.put("/tenants/:id/plan", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    await req.prisma.$executeRawUnsafe(`
      UPDATE nexus.tenants 
      SET plan = '${plan}'
      WHERE id = '${id}'
    `);
    res.json({ message: `Tenant plan upgraded to ${plan}` });
  } catch (error) { next(error); }
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

router.get("/debug/tenants", async (req, res) => {
  try {
    const { schema } = req.query;
    if (schema) {
       const users = await req.prisma.$queryRawUnsafe(`SELECT id, name, email, role FROM "${schema}".users`);
       const roles = await req.prisma.$queryRawUnsafe(`SELECT id, name FROM "${schema}".rbac_roles`);
       const menus = await req.prisma.$queryRawUnsafe(`SELECT id, label, required_plan FROM "${schema}".rbac_menus`);
       const userRoles = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".rbac_user_roles`);
       const roleMenus = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".rbac_role_menus`);
       return res.json({ users, roles, menus, userRoles, roleMenus });
    }
    const tenants = await req.prisma.$queryRawUnsafe(`SELECT id, name, db_name, plan FROM nexus.tenants`);
    res.json(tenants);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/debug/rbac-sync", async (req, res) => {
  try {
    const { schema } = req.query;
    if (!schema) return res.status(400).json({ error: "Schema param required" });
    
    console.log(`[NEXUS_DEBUG] Triggering RBAC Sync for ${schema}`);

    // 1. Ensure Schema-Level RBAC Tables Exist
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_menus (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          label VARCHAR(100) NOT NULL,
          path VARCHAR(100) NOT NULL,
          icon VARCHAR(50),
          required_plan VARCHAR(50) DEFAULT 'basic',
          parent_id UUID REFERENCES "${schema}".rbac_menus(id),
          sort_order INT DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(100) UNIQUE NOT NULL,
          description TEXT
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_role_menus (
          role_id UUID REFERENCES "${schema}".rbac_roles(id),
          menu_id UUID REFERENCES "${schema}".rbac_menus(id),
          PRIMARY KEY (role_id, menu_id)
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_role_permissions (
          role_id UUID REFERENCES "${schema}".rbac_roles(id),
          permission_id UUID REFERENCES "${schema}".rbac_permissions(id),
          PRIMARY KEY (role_id, permission_id)
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_user_roles (
          user_id UUID REFERENCES "${schema}".users(id),
          role_id UUID REFERENCES "${schema}".rbac_roles(id),
          PRIMARY KEY (user_id, role_id)
      );
    `);

    // 2. Ensure Roles exist
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_roles (name, description) VALUES 
      ('ADMIN', 'Full access'), ('DOCTOR', 'Clinical access'), ('NURSE', 'Nursing access'), 
      ('PHARMACIST', 'Pharmacy access'), ('LAB_TECH', 'Lab access'), ('SUPPORT', 'Front desk')
      ON CONFLICT (name) DO NOTHING
    `);

    // 3. Ensure Menus exist
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_menus (label, path, icon, sort_order, required_plan) VALUES
      ('Dashboard', '/tenant/dashboard', 'Dashboard', 1, 'basic'),
      ('OPD Registration', '/tenant/opd/registration', 'OPD', 2, 'basic'),
      ('Doctor''s Queue', '/tenant/opd/queue', 'Doctor', 3, 'basic'),
      ('Invoicing & Billing', '/billing', 'Billing', 10, 'basic'),
      ('Branding & UI Settings', '/tenant/settings', 'Dashboard', 12, 'basic'),
      ('Staff & RBAC', '/tenant/staff', 'Doctor', 13, 'basic'),
      ('Laboratory', '/tenant/lab', 'Lab', 4, 'standard'),
      ('Pharmacy Dashboard', '/tenant/pharmacy/dashboard', 'Pharmacy', 5, 'standard'),
      ('Stock Inventory', '/tenant/pharmacy/inventory', 'Pill', 6, 'standard'),
      ('Prescription Queue', '/tenant/pharmacy/queue', 'Receipt', 7, 'standard'),
      ('Hospital Settings (Masters)', '/tenant/masters', 'Settings', 11, 'standard'),
      ('Insurance Management', '/tenant/billing/insurance', 'Receipt', 14, 'professional'),
      ('IPD Bed Map', '/tenant/ipd/beds', 'Bed', 8, 'professional'),
      ('IPD Census & Daycare', '/tenant/ipd/admissions', 'Clipboard', 9, 'professional'),
      ('Discharge Summaries', '/tenant/ipd/discharge', 'Receipt', 15, 'professional')
      ON CONFLICT (label) DO NOTHING
    `);

    // 4. Link ADMIN to all menus
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m 
      WHERE r.name = 'ADMIN'
      ON CONFLICT DO NOTHING
    `);

    // 5. Link DOCTOR to clinical menus
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m 
      WHERE r.name = 'DOCTOR' AND m.label IN ('Dashboard', 'Doctor''s Queue', 'Laboratory', 'IPD Census', 'Bed Map')
      ON CONFLICT DO NOTHING
    `);

    // 6. Ensure current users are linked to their roles based on users.role column
    const users = await req.prisma.$queryRawUnsafe(`SELECT id, role FROM "${schema}".users`);
    for (const u of users) {
       if (u.role) {
         await req.prisma.$executeRawUnsafe(`
           INSERT INTO "${schema}".rbac_user_roles (user_id, role_id)
           SELECT '${u.id}', id FROM "${schema}".rbac_roles WHERE LOWER(name) = LOWER('${u.role}')
           ON CONFLICT DO NOTHING
         `);
       }
    }

    res.json({ message: `RBAC Sync successful for ${schema}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- TICKETING SYSTEM ---

// 1. Create Ticket (Tenant Side)
router.post("/tickets", async (req, res, next) => {
  try {
    const { tenantId, subject, category, priority, message } = req.body;
    
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO nexus.support_tickets (tenant_id, subject, category, priority, message)
      VALUES ('${tenantId}', '${subject.replace(/'/g, "''")}', '${category}', '${priority}', '${message.replace(/'/g, "''")}')
      RETURNING *
    `);
    
    const ticket = result[0];

    // Notification Email to Admin
    if (process.env.RESEND_API_KEY) {
      try {
        await axios.post('https://api.resend.com/emails', {
          from: process.env.RESEND_FROM || "HIMS Support <support@cognivectra.com>",
          to: [process.env.ADMIN_EMAIL || "admin@hims-sys.com"],
          subject: `[NEW TICKET] ${category}: ${subject}`,
          html: `<p>A new support ticket has been raised by tenant <strong>${tenantId}</strong>.</p><p><strong>Message:</strong> ${message}</p>`
        }, { headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' } });
      } catch (e) { console.error("Email notification failed", e.message); }
    }

    res.status(201).json(ticket);
  } catch (error) { next(error); }
});

// 2. List Tickets (Nexus Side or Tenant Side)
router.get("/tickets", async (req, res, next) => {
  try {
    const { tenantId } = req.query;
    let query = `
      SELECT t.*, n.name as tenant_name 
      FROM nexus.support_tickets t
      JOIN nexus.tenants n ON t.tenant_id = n.id
    `;
    if (tenantId) query += ` WHERE t.tenant_id = '${tenantId}'`;
    query += ` ORDER BY t.created_at DESC`;

    const data = await req.prisma.$queryRawUnsafe(query);
    res.json(data);
  } catch (error) { next(error); }
});

// 3. Update/Respond to Ticket (Nexus Side)
router.patch("/tickets/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, response } = req.body;
    
    const result = await req.prisma.$queryRawUnsafe(`
      UPDATE nexus.support_tickets 
      SET status = '${status}', response = '${response ? response.replace(/'/g, "''") : ""}', updated_at = NOW()
      WHERE id = '${id}'
      RETURNING *
    `);

    const ticket = result[0];

    // Notification Email to Tenant
    if (process.env.RESEND_API_KEY && ticket) {
      try {
        const tenant = await req.prisma.$queryRawUnsafe(`SELECT admin_email FROM nexus.tenants WHERE id = '${ticket.tenant_id}'`);
        if (tenant[0]?.admin_email) {
          await axios.post('https://api.resend.com/emails', {
            from: process.env.RESEND_FROM || "HIMS Support <support@cognivectra.com>",
            to: [tenant[0].admin_email],
            subject: `[TICKET UPDATED] ${ticket.subject}`,
            html: `<p>Your support ticket status has been updated to: <strong>${status}</strong>.</p><p><strong>Response from Support:</strong> ${response || "No comment."}</p>`
          }, { headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' } });
        }
      } catch (e) { console.error("Email notification failed", e.message); }
    }

    res.json(ticket);
  } catch (error) { next(error); }
});

module.exports = router;
