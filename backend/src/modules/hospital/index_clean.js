const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { checkPermission } = require("../../middleware/rbac");
const metricsRoutes = require("./metrics");
const aiService = require("../../services/aiService");
const pdfService = require("../../services/pdfService");

const s = (val) => (val === undefined || val === null ? "" : String(val).replace(/'/g, "''"));
const sqlValue = (val) => (val === undefined || val === null || val === "" ? "NULL" : `'${s(val)}'`);
const jsonValue = (val) => `'${s(JSON.stringify(val || {}))}'::jsonb`;

async function getCurrentUserId(req) {
  if (!req.user) return null;
  const email = typeof req.user === 'object' ? req.user.user : req.user;
  try {
    const users = await req.prisma.$queryRawUnsafe(`SELECT id FROM "${req.schemaName}".users WHERE LOWER(email) = LOWER('${s(email)}') LIMIT 1`);
    return users[0]?.id || null;
  } catch {
    return null;
  }
}

async function ensureDischargeTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".discharge_summaries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admission_id UUID,
      patient_id UUID,
      doctor_id UUID,
      summary_text TEXT,
      pdf_path TEXT,
      discharge_type VARCHAR(50) DEFAULT 'STANDARD',
      status VARCHAR(50) DEFAULT 'Draft',
      is_authenticated BOOLEAN DEFAULT false,
      authenticated_at TIMESTAMP,
      discharge_date TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Ensure columns exist for existing tables
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS authenticated_at TIMESTAMP`);
}

async function ensureOrderColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS instructions TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS instructions TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS medicine_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS results JSONB`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS technician_notes TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS doctor_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Normal'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS results JSONB`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT false`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false`);
}

async function ensureStaffColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS dob DATE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS doj DATE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS qualifications TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);

  // Seed default doctors if none exist
  const docCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".users WHERE role ILIKE 'doctor'`);
  if (docCount[0].count === 0) {
    const doctors = [
      { name: 'Sankaran R', email: 'sankaran@apollo.com', spec: 'Cardiology' },
      { name: 'Maheswaran R', email: 'maheswaran@apollo.com', spec: 'Orthopedics' },
      { name: 'Aravind Kumar', email: 'aravind@apollo.com', spec: 'Pediatrics' }
    ];
    for (const d of doctors) {
      const id = crypto.randomUUID();
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".users (id, name, email, password, role, specialization, is_active)
        VALUES ('${id}', '${d.name}', '${d.email}', 'password123', 'doctor', '${d.spec}', true)
      `);
    }
  }
}

async function ensurePatientColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS mrn VARCHAR(20)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS dob DATE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);

  // Seed default patients if empty
  const patCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".patients`);
  if (patCount[0].count === 0) {
    const patients = [
      { name: 'Sankaran R', mrn: 'AP-1001', gender: 'Male', age: 45 },
      { name: 'Maheswaran R', mrn: 'AP-1002', gender: 'Male', age: 52 }
    ];
    for (const p of patients) {
      const id = crypto.randomUUID();
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".patients (id, name, mrn, gender, age)
        VALUES ('${id}', '${p.name}', '${p.mrn}', '${p.gender}', ${p.age})
      `);
    }
  }
}

async function ensureEncounterTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".encounters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL,
      doctor_id UUID NOT NULL,
      type VARCHAR(50) DEFAULT 'OPD',
      status VARCHAR(50) DEFAULT 'Draft',
      vitals JSONB,
      complaints TEXT,
      diagnosis TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".encounters ADD COLUMN IF NOT EXISTS vitals JSONB`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".encounters ADD COLUMN IF NOT EXISTS complaints TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".encounters ADD COLUMN IF NOT EXISTS diagnosis TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".encounters ADD COLUMN IF NOT EXISTS notes TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".encounters ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'OPD'`);
}

async function ensureIPDMasters(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".wards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100),
      type VARCHAR(50),
      capacity INTEGER DEFAULT 0,
      base_charge NUMERIC DEFAULT 0
    )
  `);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".wards ADD COLUMN IF NOT EXISTS base_charge NUMERIC DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".wards ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".wards ADD COLUMN IF NOT EXISTS type VARCHAR(50)`);
  
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".beds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ward_id UUID REFERENCES "${req.schemaName}".wards(id),
      bed_number VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Vacant'
    )
  `);

  // --- SEEDER: Clean Slate Check ---
  console.log(`[SEEDER] Checking IPD Masters for shard: ${req.schemaName}`);
  const wardCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".wards`);
  
  if (wardCount[0].count === 0) {
    console.log(`[SEEDER] Provisioning 3 Wards and 49 Beds for shard: ${req.schemaName}`);
    const wards = [
      { name: 'General Ward - A', type: 'Regular Care', capacity: 20, charge: 1500 },
      { name: 'Semi-Private Ward', type: 'Special Care', capacity: 15, charge: 3500 },
      { name: 'Private Suite', type: 'ICU', capacity: 14, charge: 7500 }
    ];

    
    for (const w of wards) {
      const wardId = crypto.randomUUID();
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".wards (id, name, type, capacity, base_charge)
        VALUES ('${wardId}', '${w.name}', '${w.type}', ${w.capacity}, ${w.charge})
      `);
      
      // Provision beds for this ward
      const prefix = w.name.split(' ').slice(0,3).toUpperCase() || "BED";
      for (let i = 1; i <= w.capacity; i++) {
        await req.prisma.$executeRawUnsafe(`
          INSERT INTO "${req.schemaName}".beds (ward_id, bed_number, status)
          VALUES ('${wardId}', '${prefix}-${String(i).padStart(2, '0')}', 'Vacant')
        `);
      }
    }
  }

  // Seed Diagnostics if empty
  const diagCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".diagnostics`);
  if (diagCount[0].count === 0) {
    const diags = [
      { name: 'Complete Blood Count (CBC)', price: 450 },
      { name: 'Chest X-Ray', price: 800 },
      { name: 'Lipid Profile', price: 1200 },
      { name: 'MRI Brain (Plain)', price: 8500 },
      { name: 'ECG (Resting)', price: 350 }
    ];
    for (const d of diags) {
      await req.prisma.$executeRawUnsafe(`INSERT INTO "${req.schemaName}".diagnostics (name, price) VALUES ('${d.name}', ${d.price})`);
    }
  }

  // Seed Medicines if empty
  const medCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".medicines`);
  if (medCount[0].count === 0) {
    const meds = [
      { name: 'Paracetamol 500mg', cat: 'Tablet', stock: 500, price: 5 },
      { name: 'Amoxicillin 250mg', cat: 'Antibiotic', stock: 200, price: 15 },
      { name: 'Insulin Glargine', cat: 'Injectable', stock: 45, price: 850 },
      { name: 'Ibuprofen 400mg', cat: 'NSAID', stock: 350, price: 8 },
      { name: 'Cetirizine 10mg', cat: 'Antihistamine', stock: 150, price: 4 }
    ];
    for (const m of meds) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".medicines (name, category, stock_quantity, unit_price, is_active)
        VALUES ('${m.name}', '${m.cat}', ${m.stock}, ${m.price}, true)
      `);
    }
  }
}

async function ensureIPDAdmissionsTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".ipd_admissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL,
      bed_id UUID NOT NULL,
      ward_id UUID NOT NULL,
      encounter_id UUID,
      admitting_doctor_id UUID,
      admission_reason TEXT,
      daily_charge NUMERIC DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Admitted',
      admitted_at TIMESTAMP DEFAULT NOW(),
      discharged_at TIMESTAMP
    )
  `);
}

async function ensureBillingQueue(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".billing_queue (
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
    )
  `);
}

// --- GLOBAL HEAL UTILITY ---
router.get("/heal-all-masters", async (req, res, next) => {
  try {
    console.log(`[HEAL] Starting deep sync for: ${req.schemaName}`);
    await ensureStaffColumns(req);
    // Healing: Force all staff to be active by default if they were in a broken state
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".users SET is_active = true WHERE is_active IS NULL`);
    
    await ensurePatientColumns(req);
    await ensureIPDMasters(req);
    await ensureEncounterTable(req);
    await ensureOrderColumns(req);
    await ensureIPDAdmissionsTable(req);
    await ensureBillingQueue(req);
    res.json({ message: "All Clinical Masters synchronized and healed for this clinic." });
  } catch (error) {
    console.error("[HEAL] Repair failed:", error.message);
    res.status(500).json({ error: "Healing failed", details: error.message });
  }
});

// --- Staff & Doctor Lists ---
router.get("/doctors", async (req, res, next) => {
  console.log(`[HOSPITAL] Fetching doctors for schema: ${req.schemaName}`);
  try {
    await ensureStaffColumns(req);
    // --- Proactive Self-Healing ---
    // 1. Ensure all staff have is_active = true if it was missing (NULL)
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".users SET is_active = true WHERE is_active IS NULL`);
    
    // 2. Auto-promote anybody with "Dr." in their name to the DOCTOR role if they aren't already
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".users 
      SET role = 'DOCTOR' 
      WHERE (name ILIKE 'Dr.%' OR name ILIKE 'Doctor%') 
      AND role NOT IN ('DOCTOR', 'System Admin', 'Administrator')
    `);

    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, role, specialization, department 
      FROM "${req.schemaName}".users 
      WHERE (role ILIKE 'doctor' OR role = 'DOCTOR') AND is_active = true
      ORDER BY name ASC
    `);
    console.log(`[HOSPITAL] Found ${data.length} active doctors in ${req.schemaName}`);
    res.json(data);
  } catch (error) { next(error); }
});

// --- Doctor Availability ---
router.get("/doctors/:id/availability-rules", async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[HOSPITAL] Fetching availability for doctor: ${id}`);
    
    // Mock schedule data for testing
    const mockScheduleData = {
      appointments: [],
      schedules: [
        {
          id: "sched-1",
          doctor_id: id,
          weekday: 1,
          session_name: "Morning OPD",
          start_time: "09:00",
          end_time: "13:00",
          slot_duration: 30,
          consultation_type: "OPD",
          is_active: true
        },
        {
          id: "sched-2", 
          doctor_id: id,
          weekday: 2,
          session_name: "Morning OPD",
          start_time: "09:00",
          end_time: "13:00", 
          slot_duration: 30,
          consultation_type: "OPD",
          is_active: true
        },
        {
          id: "sched-3",
          doctor_id: id,
          weekday: 3,
          session_name: "Morning OPD", 
          start_time: "09:00",
          end_time: "13:00",
          slot_duration: 30,
          consultation_type: "OPD",
          is_active: true
        },
        {
          id: "sched-4",
          doctor_id: id,
          weekday: 4,
          session_name: "Morning OPD",
          start_time: "09:00", 
          end_time: "13:00", 
          slot_duration: 30,
          consultation_type: "OPD",
          is_active: true
        },
        {
          id: "sched-5",
          doctor_id: id,
          weekday: 5,
          session_name: "Morning OPD",
          start_time: "09:00",
          end_time: "13:00", 
          slot_duration: 30,
          consultation_type: "OPD",
          is_active: true
        }
      ],
      leaves: [],
      overrides: [],
      status: { status: 'AVAILABLE', delay_minutes: 0 }
    };
    
    console.log(`[HOSPITAL] Returning mock schedule data for doctor: ${id}`);
    res.json(mockScheduleData);
  } catch (error) { next(error); }
});

// Add remaining routes...
router.get("/mail-logs", async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const logs = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM nexus.communication_logs 
      WHERE tenant_id = '${tenantId}' 
      ORDER BY created_at DESC
    `);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.get("/staff", checkPermission('STAFF_MANAGE'), async (req, res, next) => {
  try {
    await ensureStaffColumns(req);
    const { search } = req.query;
    let query = `SELECT id, name, role, email, created_at, license_number, age, qualifications, experience_years, specialization, department, gender, dob, doj 
                 FROM "${req.schemaName}".users`;
    
    if (search) {
      query += ` WHERE name ILIKE '%${search}%' OR role ILIKE '%${search}%' OR department ILIKE '%${search}%' OR email ILIKE '%${search}%'`;
    }
    
    query += ` ORDER BY created_at DESC`;
    const data = await req.prisma.$queryRawUnsafe(query);
    res.json(data);
  } catch (error) { next(error); }
});

// Add remaining handlers...
module.exports = router;
