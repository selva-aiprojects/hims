// [HEARTBEAT] Clinical Infrastructure Sync - 2026-05-05
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { prisma } = require("./config/prisma");
const { audit } = require("./middleware/audit");
const { register, metrics } = require("./config/metrics");

const app = express();

// Global BigInt Serialization Fix
BigInt.prototype.toJSON = function() { return Number(this); };

// --- FULL-SERVICE AUTO-SEED (PROVISIONS SHARDS) ---
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

async function seedSamples() {
  console.log("[SEED] Performing Full-Service CLEAN SLATE Sync...");
  const tenants = [
    { name: "City Clinic", code: "city-clinic", plan: "Basic", email: "admin@cityclinic.com" },
    { name: "Metropolis Diagnostics", code: "metro-diag", plan: "Standard", email: "admin@metrodiag.com" },
    { name: "St. Marys Hospital", code: "st-marys", plan: "Professional", email: "admin@stmarys.com" },
    { name: "NHSPL Hospital", code: "nhspl", plan: "Enterprise", email: "admin@nhspl.com" }
  ];
  
  const hashedPassword = await bcrypt.hash("Healthezee@123", 10);
  const schemaPath = path.join(__dirname, "../../database/SHARD_Base_Schema.sql");
  const baseSql = fs.readFileSync(schemaPath, "utf8");

  setTimeout(async () => {
    try {
      // 1. Check if we already have tenants. Only seed if empty.
      const tenantCountRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM nexus.tenants`);
      const tenantCount = Number(tenantCountRes[0].count);
      
      if (tenantCount > 0) {
        console.log(`[SEED] Registry already contains ${tenantCount} tenants. Skipping auto-seed to preserve manual changes.`);
        return;
      }

      console.log("[SEED] Registry is empty. Performing First-Time Clinical Setup...");

      for (const t of tenants) {
        const schemaName = t.code.replace(/-/g, '_');
        try {
          const id = crypto.randomUUID();
          
          // 2. DROP & RECREATE SHARD (Deep Wipe)
          console.log(`[SEED] Resetting Shard: ${schemaName}...`);
          await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
          await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);

          // 3. Register in Nexus
          await prisma.$executeRawUnsafe(`
            INSERT INTO nexus.tenants (id, name, code, db_name, plan)
            VALUES ('${id}', '${t.name}', '${t.code}', '${schemaName}', '${t.plan}')
          `);

          // 4. Provision Shard Schema
          const statements = baseSql.split(';').filter(s => s.trim().length > 0);
          for (let statement of statements) {
            try {
              await prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public; ${statement}`);
            } catch (e) {
              if (!e.message.includes("already exists")) {
                 console.warn(`[SEED] Statement Error in ${schemaName}: ${e.message.substring(0, 50)}`);
              }
            }
          }
          
          // 5. Create Admin User
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${schemaName}".users (name, email, password_hash, role)
            VALUES ('Hospital Admin', '${t.email}', '${hashedPassword}', 'admin')
          `);
          
          console.log(`[SEED] SUCCESS: ${t.name} is clean and live.`);
        } catch (e) {
          console.error(`[SEED] FAILED for ${t.name}:`, e.message);
        }
      }
      console.log(`[SEED] SUCCESS: All tenants are synchronized on a clean slate.`);
    } catch (e) {
      console.error("[SEED] Global Sync Failed:", e.message);
    }
  }, 3000); 
}

// Administrative Route to fix/add menus for existing professional shards
app.get("/api/nexus/fix-professional-menus", async (req, res) => {
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants WHERE plan IN ('Professional', 'Enterprise')`);
    let updated = 0;
    
    for (const t of tenants) {
      const schema = t.db_name;
      
      // 0. Ensure RBAC Infrastructure exists in this shard
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".rbac_roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(50) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS "${schema}".rbac_menus (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), label VARCHAR(100) NOT NULL, path VARCHAR(100) NOT NULL, icon VARCHAR(50), required_plan VARCHAR(50) DEFAULT 'basic', sort_order INT DEFAULT 0);
          CREATE TABLE IF NOT EXISTS "${schema}".rbac_role_menus (role_id UUID REFERENCES "${schema}".rbac_roles(id), menu_id UUID REFERENCES "${schema}".rbac_menus(id), PRIMARY KEY (role_id, menu_id));
          INSERT INTO "${schema}".rbac_roles (name) 
          SELECT 'ADMIN' WHERE NOT EXISTS (SELECT 1 FROM "${schema}".rbac_roles WHERE name = 'ADMIN')
          UNION ALL
          SELECT 'DOCTOR' WHERE NOT EXISTS (SELECT 1 FROM "${schema}".rbac_roles WHERE name = 'DOCTOR') 
          UNION ALL
          SELECT 'SUPPORT' WHERE NOT EXISTS (SELECT 1 FROM "${schema}".rbac_roles WHERE name = 'SUPPORT');
        `);
      } catch (e) { console.warn(`RBAC init failed for ${schema}:`, e.message); continue; }

      // 1. Ensure Menu exists
      const existing = await prisma.$queryRawUnsafe(`SELECT id FROM "${schema}".rbac_menus WHERE label = 'Admission Desk'`);
      let menuId;
      if (existing.length === 0) {
        const result = await prisma.$queryRawUnsafe(`
          INSERT INTO "${schema}".rbac_menus (label, path, icon, sort_order, required_plan)
          VALUES ('Admission Desk', '/tenant/ipd/admission-desk', 'Bed', 7, 'professional')
          RETURNING id
        `);
        menuId = result[0].id;
      } else {
        menuId = existing[0].id;
      }
      
      // 2. Link to ADMIN, DOCTOR, and SUPPORT roles
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
        SELECT id, '${menuId}' FROM "${schema}".rbac_roles 
        WHERE name IN ('ADMIN', 'DOCTOR', 'SUPPORT')
        ON CONFLICT DO NOTHING
      `);
      updated++;
    }
    res.json({ message: `Successfully synchronized Admission Desk for ${updated} professional shards.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Administrative Route to fix/add system menus for all shards
app.get("/api/nexus/fix-system-menus", async (req, res) => {
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);
    let updated = 0;
    
    for (const t of tenants) {
      const schema = t.db_name;

      // 0. Ensure Communications table exists
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schema}".communications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      const menusToAdd = [
        { label: 'Admission Desk', path: '/tenant/ipd/admission-desk', icon: 'Bed', sort: 7, plan: 'professional' },
        { label: 'OPD Billing & Revenue Center', path: '/billing?type=OPD', icon: 'Billing', sort: 10, plan: 'basic' },
        { label: 'Laboratory Billing', path: '/tenant/lab/billing', icon: 'Billing', sort: 11, plan: 'basic' },
        { label: 'Pharmacy Billing', path: '/billing?type=PHARMACY', icon: 'Billing', sort: 12, plan: 'basic' },
        { label: 'IPD & Discharge Billing', path: '/billing?type=IPD', icon: 'Billing', sort: 13, plan: 'professional' },
        { label: 'Insurance Management', path: '/tenant/billing/insurance', icon: 'Receipt', sort: 14, plan: 'professional' },
        { label: 'Discharge Summaries', path: '/tenant/ipd/discharge', icon: 'Receipt', sort: 15, plan: 'professional' },
        { label: 'Message Board', path: '/tenant/communication', icon: 'Dashboard', sort: 17, plan: 'basic' },
        { label: 'Mail Management', path: '/tenant/mail', icon: 'Receipt', sort: 18, plan: 'basic' },
        { label: 'Ticketing Management System', path: '/tenant/support', icon: 'Receipt', sort: 16, plan: 'basic' },
        { label: 'AI Lab Assistant', path: '/tenant/lab/ai', icon: 'Lab', sort: 9, plan: 'professional' },
        { label: 'Consultation Desk', path: '/tenant/opd/consultation', icon: 'Doctor', sort: 5, plan: 'basic' },
        { label: 'Staff & RBAC', path: '/tenant/staff', icon: 'Settings', sort: 20, plan: 'basic' }
      ];

      for (const menu of menusToAdd) {
        const existing = await prisma.$queryRawUnsafe(`SELECT id FROM "${schema}".rbac_menus WHERE label = '${menu.label}'`);
        let menuId;
        if (existing.length === 0) {
          const result = await prisma.$queryRawUnsafe(`
            INSERT INTO "${schema}".rbac_menus (label, path, icon, sort_order, required_plan)
            VALUES ('${menu.label}', '${menu.path}', '${menu.icon}', ${menu.sort}, '${menu.plan}')
            RETURNING id
          `);
          menuId = result[0].id;
        } else {
          menuId = existing[0].id;
        }

        // Link to ADMIN, DOCTOR and LAB roles
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
          SELECT id, '${menuId}' FROM "${schema}".rbac_roles 
          WHERE name IN ('ADMIN', 'DOCTOR', 'LAB_TECH', 'LAB_ASSISTANT', 'NURSE', 'System Admin', 'Administrator', 'SUPERADMIN')
          ON CONFLICT DO NOTHING
        `);
      }
      updated++;
    }
    res.json({ message: `Successfully synchronized system menus and tables for ${updated} shards. Please LOGOUT and LOGIN again to see changes.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Administrative Route to synchronize staff and patient schema across all shards
app.get("/api/nexus/fix-staff-and-patients", async (req, res) => {
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);
    let updated = 0;
    
    // Also ensure Nexus registry is healed
    await prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS ui_settings JSONB DEFAULT '{}'::jsonb`);
    await prisma.$executeRawUnsafe(`ALTER TABLE nexus.tenants ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255)`);

    for (const t of tenants) {
      const schema = t.db_name;
      try {
        // Fix Patients table
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS ai_summary TEXT`);
        
        // Fix Users table (Staff)
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS age INTEGER`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS qualifications TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS experience_years INTEGER`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);
        
        updated++;
      } catch (shardErr) {
        console.error(`Failed to heal shard ${schema}:`, shardErr.message);
      }
    }
    res.json({ message: `Successfully healed ${updated} shards. Staff fields and AI Summary columns are now present.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Administrative Route to synchronize ward categories for existing shards
app.get("/api/nexus/fix-ward-categories", async (req, res) => {
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants WHERE plan IN ('Professional', 'Enterprise')`);
    let updated = 0;
    
    for (const t of tenants) {
      const schema = t.db_name;

      // 0. Ensure schema consistency
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schema}".wards ADD COLUMN IF NOT EXISTS base_charge NUMERIC DEFAULT 0;
        ALTER TABLE "${schema}".wards ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 10;
        ALTER TABLE "${schema}".wards ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Regular Care';
        ALTER TABLE "${schema}".wards ADD COLUMN IF NOT EXISTS floor VARCHAR(50);
      `);

      // 1. Update existing wards to standard categories for testing/demo
      await prisma.$executeRawUnsafe(`
        UPDATE "${schema}".wards SET type = 'Emergency' WHERE name ILIKE '%Emergency%' OR type = 'Critical Care';
        UPDATE "${schema}".wards SET type = 'ICU' WHERE name ILIKE '%ICU%';
        UPDATE "${schema}".wards SET type = 'Regular Care' WHERE name ILIKE '%General%' OR type = 'General' OR type IS NULL;
        UPDATE "${schema}".wards SET type = 'Daycare' WHERE name ILIKE '%Day%' OR type = 'Pediatric';
        UPDATE "${schema}".wards SET type = 'Special Care' WHERE name ILIKE '%Premium%' OR type = 'Premium';
        
        -- If no wards exist, create defaults
        INSERT INTO "${schema}".wards (name, floor, type, capacity, base_charge)
        SELECT 'Emergency Unit', 'Ground Floor', 'Emergency', 10, 2500 WHERE NOT EXISTS (SELECT 1 FROM "${schema}".wards WHERE type = 'Emergency');
        INSERT INTO "${schema}".wards (name, floor, type, capacity, base_charge)
        SELECT 'Main ICU', '1st Floor', 'ICU', 8, 5000 WHERE NOT EXISTS (SELECT 1 FROM "${schema}".wards WHERE type = 'ICU');
        INSERT INTO "${schema}".wards (name, floor, type, capacity, base_charge)
        SELECT 'Medical Ward A', '2nd Floor', 'Regular Care', 20, 1500 WHERE NOT EXISTS (SELECT 1 FROM "${schema}".wards WHERE type = 'Regular Care');
        INSERT INTO "${schema}".wards (name, floor, type, capacity, base_charge)
        SELECT 'Pediatric Daycare', 'Ground Floor', 'Daycare', 5, 1000 WHERE NOT EXISTS (SELECT 1 FROM "${schema}".wards WHERE type = 'Daycare');
      `);
      updated++;
    }
    res.json({ message: `Successfully synchronized ward categories for ${updated} shards.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Administrative Route to synchronize billing infrastructure (Queue & Discounts)
app.get("/api/nexus/fix-billing-infrastructure", async (req, res) => {
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);
    let updated = 0;
    
    for (const t of tenants) {
      const schema = t.db_name;
      try {
        // 1. Create Billing Queue Table
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".billing_queue (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              patient_id UUID NOT NULL,
              encounter_id UUID,
              source_module VARCHAR(50), 
              source_id UUID,            
              description TEXT,
              quantity NUMERIC DEFAULT 1,
              unit_price NUMERIC NOT NULL,
              tax_percent NUMERIC DEFAULT 0,
              is_discountable BOOLEAN DEFAULT TRUE,
              status VARCHAR(20) DEFAULT 'PENDING', 
              created_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // 2. Add Discount Columns to Invoices
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".invoice_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".invoice_items ADD COLUMN IF NOT EXISTS source_queue_id UUID`);
        
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".lab_orders ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES "${schema}".patients(id)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".lab_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".appointments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".ipd_admissions ADD COLUMN IF NOT EXISTS admitted_at TIMESTAMP DEFAULT NOW()`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".ipd_admissions ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMP`);
        
        // 4. Comprehensive Patient Profile Healing
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS dob DATE`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS address TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(50)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS medical_history TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".patients ADD COLUMN IF NOT EXISTS allergies TEXT`);
        
        // 5. Insurance & TPA Infrastructure
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".insurance_providers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) UNIQUE NOT NULL,
            tpa_name VARCHAR(255),
            contact_person VARCHAR(100),
            email VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS "${schema}".insurance_claims (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID REFERENCES "${schema}".patients(id),
            invoice_id UUID, -- Will link to invoices
            provider_id UUID REFERENCES "${schema}".insurance_providers(id),
            policy_number VARCHAR(100),
            insurer_id VARCHAR(100), -- Family/Individual ID
            claim_type VARCHAR(50), -- Cashless, Co-pay, Corporate, etc.
            status VARCHAR(50) DEFAULT 'PRE-AUTH PENDING',
            billed_amount NUMERIC DEFAULT 0,
            sanctioned_amount NUMERIC DEFAULT 0,
            reference_number VARCHAR(100), -- Billing Ref
            claim_number VARCHAR(100), -- TPA Claim ID
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );

          -- Seed default providers if empty
          INSERT INTO "${schema}".insurance_providers (name, tpa_name)
          VALUES 
            ('Star Health Insurance', 'Star TPA'),
            ('HDFC ERGO', 'HDFC TPA'),
            ('ICICI Lombard', 'Lombard TPA'),
            ('Apollo Munich', 'Apollo TPA'),
            ('Government Health Scheme', 'Govt TPA')
          ON CONFLICT DO NOTHING;
        `);

        updated++;
      } catch (shardErr) {
        console.error(`Failed to upgrade billing for shard ${schema}:`, shardErr.message);
      }
    }
    res.json({ message: `Successfully upgraded billing and insurance infrastructure for ${updated} shards.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Administrative Route to synchronize enterprise scheduling across all shards
app.get("/api/nexus/fix-enterprise-scheduling", async (req, res) => {
  try {
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name FROM nexus.tenants`);
    let updated = 0;
    
    for (const t of tenants) {
      const schema = t.db_name;
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".doctor_schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_id UUID NOT NULL REFERENCES "${schema}".users(id),
            weekday INTEGER NOT NULL,
            session_name VARCHAR(100),
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            slot_duration INTEGER DEFAULT 30,
            consultation_type VARCHAR(50) DEFAULT 'OPD',
            location VARCHAR(255),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS "${schema}".doctor_leaves (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_id UUID NOT NULL REFERENCES "${schema}".users(id),
            leave_type VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            reason TEXT,
            is_emergency BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS "${schema}".doctor_overrides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_id UUID NOT NULL REFERENCES "${schema}".users(id),
            override_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            is_available BOOLEAN DEFAULT true,
            reason TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        updated++;
      } catch (shardErr) {
        console.error(`Failed to upgrade scheduling for shard ${schema}:`, shardErr.message);
      }
    }
    res.json({ message: `Successfully synchronized Enterprise Scheduling infrastructure for ${updated} shards.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Seeding Endpoint (to prevent startup timeouts)

app.get("/api/nexus/seed-database", async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.AUTO_SEED !== 'true') {
    return res.status(403).json({ error: "Seeding is disabled in production" });
  }
  try {
    console.log("[SEED] Manual Seed Triggered...");
    await seedSamples();
    res.json({ message: "Seeding process started. Check logs for progress." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CORS configuration
app.use(cors({
  origin: true, // Dynamically allow the requesting origin
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
  credentials: true
}));

app.use(express.json());

// Attach Prisma to req globally
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check before other middleware
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/health-db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// --- PROMETHEUS METRICS ENDPOINT (Vercel Optimized - Reads from DB) ---
app.get("/metrics", async (req, res) => {
  try {
    // 1. Clear previous in-memory values to avoid stale data from previous invocations
    metrics.tenantDbSize.reset();
    metrics.tenantActiveUsers.reset();
    metrics.tenantTotalRecords.reset();

    // 2. Fetch latest actuals from the database
    const latestLogs = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT ON (tenant_id) l.*, t.name as tenant_name, t.plan
      FROM nexus.utilization_logs l
      JOIN nexus.tenants t ON l.tenant_id = t.id
      ORDER BY tenant_id, created_at DESC
    `);

    // 3. Populate Gauges for the current response
    for (const log of latestLogs) {
      metrics.tenantDbSize.set({ tenant_id: log.tenant_id, tenant_name: log.tenant_name, plan: log.plan }, parseFloat(log.db_size_mb));
      metrics.tenantActiveUsers.set({ tenant_id: log.tenant_id, tenant_name: log.tenant_name }, log.active_users);
      metrics.tenantTotalRecords.set({ tenant_id: log.tenant_id, tenant_name: log.tenant_name }, log.total_records);
    }

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    console.error("[METRICS] Failed to serve Prometheus metrics:", ex.message);
    res.status(500).end(ex.message);
  }
});

// --- BACKGROUND METRICS SYNC (Triggerable via Cron or Manual) ---
async function syncPrometheusMetrics() {
  try {
    console.log("[METRICS] Triggering Infrastructure-wide Actuals Sync...");
    const tenants = await prisma.$queryRawUnsafe(`SELECT id, name, db_name, plan FROM nexus.tenants`);
    
    for (const tenant of tenants) {
      const schema = tenant.db_name;
      const sizeResult = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))), 0) / 1024 / 1024 AS size_mb
        FROM pg_stat_user_tables
        WHERE schemaname = '${schema}'
      `);
      const sizeMb = parseFloat(sizeResult[0]?.size_mb || 0);
      
      let userCount = 0;
      let recordCount = 0;
      try {
        const counts = await prisma.$queryRawUnsafe(`
          SELECT 
            (SELECT COUNT(*) FROM "${schema}".users) as users,
            (SELECT COUNT(*) FROM "${schema}".patients) as patients
        `);
        userCount = Number(counts[0].users || 0);
        recordCount = Number(counts[0].patients || 0);
      } catch (e) {}

      // PERSIST to Database so /metrics can read it anytime
      await prisma.$executeRawUnsafe(`
        INSERT INTO nexus.utilization_logs (tenant_id, db_size_mb, total_records, active_users)
        VALUES ('${tenant.id}', ${sizeMb}, ${recordCount}, ${userCount})
      `);
    }
    console.log(`[METRICS] Successfully persisted actuals for ${tenants.length} tenants.`);
    return true;
  } catch (err) {
    console.error("[METRICS] Sync failed:", err.message);
    return false;
  }
}

// Route to trigger sync via Vercel Cron
app.get("/api/nexus/utilization/sync-actuals", async (req, res) => {
  const success = await syncPrometheusMetrics();
  res.json({ success, message: success ? "Metrics synchronized" : "Sync failed" });
});

app.use(audit);
app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error("--- ERROR ---");
  console.error(err);
  console.error("-------------");
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    details: err.code || null
  });
});

module.exports = app;