const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { checkPermission } = require("../../middleware/rbac");
const metricsRoutes = require("./metrics");
const aiService = require("../../services/aiService");
const pdfService = require("../../services/pdfService");
const bcrypt = require("bcryptjs");
const upload = require("../../config/upload");

const s = (val) => (val === undefined || val === null ? "" : String(val).replace(/'/g, "''"));
const sqlValue = (val) => (val === undefined || val === null || val === "" ? "NULL" : `'${s(val)}'`);
const jsonValue = (val) => `'${s(JSON.stringify(val || {}))}'::jsonb`;

async function getCurrentUserId(req) {
  if (!req.user) return null;
  try {
    const users = await req.prisma.$queryRawUnsafe(`SELECT id FROM "${req.schemaName}".users WHERE LOWER(email) = LOWER('${s(req.user)}') LIMIT 1`);
    return users[0]?.id || null;
  } catch {
    return null;
  }
}

async function ensureDischargeTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".discharge_summaries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admission_id UUID UNIQUE,
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
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS authenticated_at TIMESTAMP`);
}

async function ensureOrderColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS instructions TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false`);
  
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS instructions TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS medicine_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS results JSONB`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS technician_notes TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS test_name VARCHAR(255)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Normal'`);
}

const staffSyncedSchemas = new Set();

async function ensureStaffColumns(req, force = false) {
  const schema = req.schemaName;
  if (!schema) return;
  if (staffSyncedSchemas.has(schema) && !force) return;
  
  try {
    // 1. Column Healing (Consolidated)
    await req.prisma.$executeRawUnsafe(`
      ALTER TABLE "${req.schemaName}".users 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
      ADD COLUMN IF NOT EXISTS dob DATE,
      ADD COLUMN IF NOT EXISTS doj DATE,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS qualifications TEXT
    `);

    // 2. Dynamic, Isolated Seeding
    const hospitalPrefix = req.tenantName?.split(' ')[0] || schema.split('_')[0].toUpperCase();
    const domain = `${schema.replace(/_/g, '-')}.hims.com`;
    const pwd = await bcrypt.hash('Healthezee@123', 10);
    
    // Cleanup any OLD mock staff from previous global seeding or base schema
    const legacyEmails = [
      'sankaran@apollo.com', 'maheswaran@apollo.com', 'aravind@apollo.com', 
      'clara@apollo.com', 'florence@apollo.com', 'pharmacy@apollo.com', 
      'lab@apollo.com', 'reception@apollo.com', 'mrutyunjaya@apollo.com', 
      'santhanakrishnan@apollo.com'
    ];
    
    await req.prisma.$executeRawUnsafe(`
      DELETE FROM "${req.schemaName}".rbac_user_roles 
      WHERE user_id IN (
        SELECT id FROM "${req.schemaName}".users
        WHERE email IN (${legacyEmails.map(e => `'${e}'`).join(',')})
        OR (name LIKE 'Dr.%' AND email LIKE '%@apollo.com')
        OR (name IN ('Dr. Mrutyunjaya', 'Dr. Santhanakrishnan', 'Dr. Aravind Kumar', 'Dr. Sankaran R', 'Dr. Maheswaran R'))
        OR (email LIKE 'aravind@%')
        OR (email LIKE 'santhan@%')
      )
    `);
    
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".users
      SET is_active = false
      WHERE email IN (${legacyEmails.map(e => `'${e}'`).join(',')})
      OR (name LIKE 'Dr.%' AND email LIKE '%@apollo.com')
      OR (name IN ('Dr. Mrutyunjaya', 'Dr. Santhanakrishnan', 'Dr. Aravind Kumar', 'Dr. Sankaran R', 'Dr. Maheswaran R'))
      OR (email LIKE 'aravind@%')
      OR (email LIKE 'santhan@%')
    `);

    const staffTemplate = [
      { name: `Dr. ${hospitalPrefix} Senior Surgeon`, email: `surgeon1@${domain}`, role: 'DOCTOR', spec: 'General Surgery', dept: 'Surgery' },
      { name: `Dr. ${hospitalPrefix} Consultant`, email: `consultant1@${domain}`, role: 'DOCTOR', spec: 'Internal Medicine', dept: 'OPD' },
      { name: `Dr. ${hospitalPrefix} Specialist`, email: `specialist1@${domain}`, role: 'DOCTOR', spec: 'Cardiology', dept: 'Cardiology' }
    ];

    for (const s of staffTemplate) {
      const id = crypto.randomUUID();
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".users (id, name, email, password_hash, role, specialization, department, is_active)
        VALUES ('${id}', '${s.name}', '${s.email}', '${pwd}', '${s.role}', '${s.spec}', '${s.dept}', true)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          specialization = EXCLUDED.specialization,
          department = EXCLUDED.department,
          is_active = true
      `);
    }

    // 3. Deduplication Cleanup
    await req.prisma.$executeRawUnsafe(`
      DELETE FROM "${req.schemaName}".users a
      USING "${req.schemaName}".users b
      WHERE a.id > b.id AND a.email = b.email
    `);
    
    staffSyncedSchemas.add(schema);
  } catch (err) {
    console.warn(`[STAFF_HEALING] Error for ${req.schemaName}:`, err.message);
  }
}

async function ensureDoctorScheduleTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".doctor_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id UUID NOT NULL,
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
    )
  `);
}

async function ensureDefaultDoctorSchedule(req, doctorId) {
  await ensureDoctorScheduleTable(req);

  for (let weekday = 1; weekday <= 6; weekday += 1) {
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".doctor_schedules
        (doctor_id, weekday, session_name, start_time, end_time, slot_duration, consultation_type, location, is_active)
      SELECT '${s(doctorId)}', ${weekday}, 'Morning OPD', '09:00', '13:00', 30, 'OPD', 'Main OPD', true
      WHERE NOT EXISTS (
        SELECT 1 FROM "${req.schemaName}".doctor_schedules
        WHERE doctor_id = '${s(doctorId)}'
          AND weekday = ${weekday}
          AND start_time = '09:00'
          AND end_time = '13:00'
          AND consultation_type = 'OPD'
      )
    `);
  }
}

async function ensurePatientColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS mrn VARCHAR(20)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
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
}

async function ensureTableColumns(req, table) {
  try {
    await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS description TEXT`);
    await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS category VARCHAR(255)`);
    await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS hod VARCHAR(255)`);
    await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS specialty VARCHAR(255)`);
    await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS base_consultation_fee NUMERIC DEFAULT 0`);
    if (table === 'medicines') {
      await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS uom VARCHAR(50) DEFAULT 'Tablet'`);
      await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}"."${table}" ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100)`);
    }
  } catch (e) {}
}

async function ensureIPDMasters(req) {
  await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${req.schemaName}".wards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100), type VARCHAR(50), capacity INTEGER DEFAULT 0, base_charge NUMERIC DEFAULT 0)`);
  await ensureTableColumns(req, 'wards');
  await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${req.schemaName}".beds (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ward_id UUID REFERENCES "${req.schemaName}".wards(id), bed_number VARCHAR(50), status VARCHAR(50) DEFAULT 'Vacant')`);

  // Seed Diagnostics if missing
  try {
    const diags = [
      { name: 'Complete Blood Count (CBC)', price: 450 },
      { name: 'Chest X-Ray', price: 800 },
      { name: 'Lipid Profile', price: 1200 },
      { name: 'MRI Brain (Plain)', price: 8500 },
      { name: 'ECG (Resting)', price: 350 }
    ];
    for (const d of diags) {
      const existing = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".diagnostics WHERE name = '${d.name}'`);
      if (existing.length === 0) {
        await req.prisma.$executeRawUnsafe(`INSERT INTO "${req.schemaName}".diagnostics (name, price) VALUES ('${d.name}', ${d.price})`);
      }
    }
  } catch (e) {
    console.warn("[SEED] Could not seed diagnostics:", e.message);
  }
}

async function ensureIPDAdmissionsTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".ipd_admissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL,
      bed_id UUID,
      ward_id UUID,
      admitting_doctor_id UUID,
      encounter_id UUID,
      admission_reason TEXT,
      daily_charge NUMERIC DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Admitted',
      admitted_at TIMESTAMP DEFAULT NOW(),
      discharged_at TIMESTAMP
    )
  `);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_admissions ADD COLUMN IF NOT EXISTS encounter_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_admissions ADD COLUMN IF NOT EXISTS admitted_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_admissions ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMP`);
  
  // Self-healing for Discharge Checklist & Transfers
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_admissions ADD COLUMN IF NOT EXISTS pharmacy_cleared BOOLEAN DEFAULT FALSE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_admissions ADD COLUMN IF NOT EXISTS billing_cleared BOOLEAN DEFAULT FALSE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_admissions ADD COLUMN IF NOT EXISTS clinical_cleared BOOLEAN DEFAULT FALSE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_admissions ADD COLUMN IF NOT EXISTS original_admitted_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".ipd_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admission_id UUID NOT NULL,
      note_text TEXT NOT NULL,
      note_type VARCHAR(50) DEFAULT 'Progress',
      doctor_id UUID,
      doctor_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_notes ADD COLUMN IF NOT EXISTS note_type VARCHAR(50) DEFAULT 'Progress'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_notes ADD COLUMN IF NOT EXISTS doctor_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_notes ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".ipd_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
}

async function ensureInsuranceInfrastructure(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".insurance_providers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      tpa_name VARCHAR(255),
      contact_person VARCHAR(100),
      email VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Ensure columns exist for older table versions
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_providers ADD COLUMN IF NOT EXISTS tpa_name VARCHAR(255)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_providers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_providers ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);

  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".insurance_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id UUID REFERENCES "${req.schemaName}".insurance_providers(id),
      plan_name VARCHAR(255) NOT NULL,
      description TEXT,
      base_coverage NUMERIC DEFAULT 0,
      copay_percent NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".patient_insurance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID REFERENCES "${req.schemaName}".patients(id),
      provider_id UUID REFERENCES "${req.schemaName}".insurance_providers(id),
      plan_id UUID REFERENCES "${req.schemaName}".insurance_plans(id),
      policy_number VARCHAR(100),
      total_limit NUMERIC DEFAULT 0,
      remaining_limit NUMERIC DEFAULT 0,
      copay_percent NUMERIC DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Active',
      valid_till DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function ensureBillingQueue(req) {
  await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${req.schemaName}".billing_queue (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL, encounter_id UUID, source_module VARCHAR(50), source_id UUID, description TEXT, quantity NUMERIC DEFAULT 1, unit_price NUMERIC NOT NULL, tax_percent NUMERIC DEFAULT 0, is_discountable BOOLEAN DEFAULT TRUE, status VARCHAR(20) DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT NOW())`);
}

async function ensureSuppliersTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// --- METRICS ---
router.use("/metrics", metricsRoutes);

// --- GLOBAL HEAL UTILITY ---
router.get("/heal-all-masters", async (req, res, next) => {
  try {
    await ensureStaffColumns(req, true);
    await ensurePatientColumns(req);
    await ensureIPDMasters(req);
    await ensureIPDAdmissionsTable(req);
    await ensureEncounterTable(req);
    await ensureOrderColumns(req);
    await ensureDischargeTable(req);
    await ensureBillingQueue(req);
    await ensureSuppliersTable(req);
    await ensureInsuranceInfrastructure(req);
    res.json({ success: true, message: "Clinical environment provisioned." });
  } catch (error) { next(error); }
});

// --- DOCTOR LIST (Clinical Staff Only) ---
router.get("/doctors", async (req, res, next) => {
  try {
    await ensureStaffColumns(req);
    // Staff creation stores roles in lowercase, while seeded doctors use uppercase.
    // Keep the doctor lookup case-insensitive so newly added doctors appear here.
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, role, specialization, department 
      FROM "${req.schemaName}".users 
      WHERE (role ILIKE 'doctor' OR name ILIKE 'Dr.%') AND is_active = true
      ORDER BY name ASC
    `);
    for (const doctor of data) {
      await ensureDefaultDoctorSchedule(req, doctor.id);
    }
    console.log(`[HOSPITAL] Returning ${data.length} active doctors for schema ${req.schemaName}`);
    res.json(data);
  } catch (error) { next(error); }
});

// --- MASTERS HUB ---
const masterTables = [
  { path: 'departments', table: 'departments' },
  { path: 'specialities', table: 'specialities' },
  { path: 'modes', table: 'consultation_modes' },
  { path: 'diseases', table: 'diseases' },
  { path: 'treatments', table: 'treatments' },
  { path: 'diagnostics', table: 'diagnostics' },
  { path: 'medicines', table: 'medicines' },
  { path: 'services', table: 'services' },
  { path: 'wards', table: 'wards' },
  { path: 'suppliers', table: 'suppliers' }
];

masterTables.forEach(({ path, table }) => {
  router.get(`/masters/${path}`, async (req, res, next) => {
    try {
      if (path === 'suppliers') await ensureSuppliersTable(req);
      await ensureTableColumns(req, table);
      const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}"."${table}"`);
      res.json(data);
    } catch (error) { next(error); }
  });

  router.post(`/masters/${path}`, async (req, res, next) => {
    try {
      await ensureTableColumns(req, table);
      
      // Table-aware field filtering
      const tableFields = {
        departments: ['name', 'description', 'hod', 'specialty', 'status'],
        specialities: ['name', 'description', 'base_consultation_fee'],
        consultation_modes: ['name', 'surcharge_percent', 'is_virtual'],
        diseases: ['name', 'category', 'icd_code', 'severity_level'],
        treatments: ['name', 'category', 'price', 'description', 'cpt_code', 'estimated_duration'],
        diagnostics: ['name', 'price', 'category'],
        medicines: ['name', 'category', 'composition', 'dosage_adult', 'dosage_pediatric', 'instructions', 'unit_price', 'stock_quantity', 'uom', 'batch_number'],
        services: ['name', 'category', 'service_code', 'price', 'tax_percent'],
        wards: ['name', 'type', 'capacity', 'floor', 'base_charge'],
        suppliers: ['name', 'contact_person', 'email', 'phone', 'address']
      };

      const allowed = tableFields[table] || ['name', 'description', 'category', 'price'];
      const fields = Object.keys(req.body).filter(f => allowed.includes(f) || (f === 'fee' && allowed.includes('base_consultation_fee')));
      
      if (fields.length === 0) return res.status(400).json({ error: "No valid fields provided for this master type." });

      const finalFields = fields.map(f => f === 'fee' ? 'base_consultation_fee' : f);
      const values = fields.map(f => {
        const val = req.body[f];
        if (val === undefined || val === null || val === '') return 'NULL';
        return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
      });

      const query = `INSERT INTO "${req.schemaName}"."${table}" (${finalFields.join(',')}) VALUES (${values.join(',')}) RETURNING *`;
      const result = await req.prisma.$queryRawUnsafe(query);
      res.status(201).json(result[0]);
    } catch (error) { 
      console.error(`[MASTERS_POST_ERROR] ${table}:`, error.message);
      next(error); 
    }
  });

  router.post(`/masters/${path}/bulk`, async (req, res, next) => {
    try {
      await ensureTableColumns(req, table);
      const items = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      for (const item of items) {
        const fields = Object.keys(item).filter(f => ['name','description','category','price','unit_price','stock_quantity','expiry_date','hod','specialty','status','uom'].includes(f));
        const values = fields.map(f => {
          let val = item[f];
          
          if (val === undefined || val === null || val === '') {
            if (f.includes('date')) return 'NULL';
            if (f.includes('price') || f.includes('quantity') || f === 'price') return '0';
            return "''";
          }
          
          // Date Normalization (Handle DD-MM-YYYY and other formats)
          if (f.includes('date') && typeof val === 'string') {
            if (val.includes('-') && val.split('-')[0].length === 2) {
              const parts = val.split('-');
              val = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY to YYYY-MM-DD
            } else if (val.includes('/') && val.split('/')[0].length === 2) {
              const parts = val.split('/');
              val = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD/MM/YYYY to YYYY-MM-DD
            }
          }

          if (typeof val === 'number') {
            if (isNaN(val)) return '0';
            return val;
          }
          return `'${val.toString().replace(/'/g, "''")}'`;
        });
        const query = `INSERT INTO "${req.schemaName}"."${table}" (${fields.join(',')}) VALUES (${values.join(',')}) RETURNING *`;
        const result = await req.prisma.$queryRawUnsafe(query);
        results.push(result[0]);
      }
      res.status(201).json(results);
    } catch (error) { next(error); }
  });
});

router.get("/staff", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".users ORDER BY created_at DESC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/staff", async (req, res, next) => {
  try {
    const { name, email, password, role, specialization, department, gender, dob, doj, license_number, experience_years, qualifications } = req.body;
    const id = crypto.randomUUID();
    const pwd = await bcrypt.hash(password || 'password123', 10);
    
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".users (
        id, name, email, password_hash, role, specialization, department, 
        gender, dob, doj, license_number, experience_years, qualifications, is_active
      )
      VALUES (
        '${id}', '${s(name)}', '${s(email)}', '${pwd}', '${s(role)}', 
        ${sqlValue(specialization)}, ${sqlValue(department)}, 
        ${sqlValue(gender)}, ${sqlValue(dob)}, ${sqlValue(doj)},
        ${sqlValue(license_number)}, ${experience_years || 0}, ${sqlValue(qualifications)}, true
      )
    `);
    if (String(role || '').toLowerCase() === 'doctor') {
      await ensureDefaultDoctorSchedule(req, id);
    }
    res.status(201).json({ id, name, email, role });
  } catch (error) { next(error); }
});

router.put("/staff/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, specialization, department, gender, dob, doj, license_number, experience_years, qualifications } = req.body;
    
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".users 
      SET name = '${s(name)}', 
          email = '${s(email)}', 
          role = '${s(role)}', 
          specialization = ${sqlValue(specialization)}, 
          department = ${sqlValue(department)},
          gender = ${sqlValue(gender)},
          dob = ${sqlValue(dob)},
          doj = ${sqlValue(doj)},
          license_number = ${sqlValue(license_number)},
          experience_years = ${experience_years || 0},
          qualifications = ${sqlValue(qualifications)}
      WHERE id = '${id}'
    `);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.delete("/staff/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".users WHERE id = '${id}'`);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// --- ENCOUNTERS (OPD/IPD VISITS) ---
router.post("/encounters", async (req, res, next) => {
  try {
    await ensureEncounterTable(req);
    await ensureBillingQueue(req);
    const { patientId, doctorId, type, vitals, complaints } = req.body;
    const query = `
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, type, vitals, complaints, status)
      VALUES ('${patientId}', '${doctorId}', '${type}', ${jsonValue(vitals)}, '${s(complaints)}', 'Active')
      RETURNING *
    `;
    const result = await req.prisma.$queryRawUnsafe(query);
    const encounter = result[0];

    // Push Consultation Fee to Billing Queue
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, quantity, unit_price)
      VALUES ('${patientId}', '${encounter.id}', 'OPD', '${encounter.id}', 'Consultation Fee', 1, 500)
    `);

    res.status(201).json(encounter);
  } catch (error) { next(error); }
});

router.put("/encounters/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosis, status, notes, vitals } = req.body;
    
    let query = `UPDATE "${req.schemaName}".encounters SET `;
    const updates = [];
    if (diagnosis !== undefined) updates.push(`diagnosis = '${s(diagnosis)}'`);
    if (status !== undefined) updates.push(`status = '${s(status)}'`);
    if (notes !== undefined) updates.push(`notes = '${s(notes)}'`);
    if (vitals !== undefined) updates.push(`vitals = '${JSON.stringify(vitals)}'`);
    
    if (updates.length === 0) return res.json({ success: true });
    
    query += updates.join(', ');
    query += ` WHERE id = '${id}'`;
    
    await req.prisma.$executeRawUnsafe(query);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.get("/encounters", async (req, res, next) => {
  try {
    await ensureEncounterTable(req);
    const status = req.query.status || 'Active';
    const patientId = req.query.patientId;
    const doctorId = req.query.doctorId;
    const patientFilter = patientId ? `AND e.patient_id = '${patientId}'` : '';
    const doctorFilter = doctorId ? `AND e.doctor_id = '${doctorId}'` : '';
    const statusFilter = status === 'All' ? '' : `AND e.status = '${status}'`;
    
    // Enhanced Query to fetch Predictions and latest Events
    const query = `
      SELECT 
        e.*, 
        p.name as patient_name, p.mrn, p.age, p.gender,
        u.name as doctor_name,
        cp.predicted_time_mins,
        (SELECT event_type FROM "${req.schemaName}".consultation_events WHERE encounter_id = e.id ORDER BY created_at DESC LIMIT 1) as latest_event,
        (SELECT created_at FROM "${req.schemaName}".consultation_events WHERE encounter_id = e.id AND event_type = 'CONSULT_START' ORDER BY created_at DESC LIMIT 1) as start_time
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      LEFT JOIN "${req.schemaName}".consultation_predictions cp ON cp.encounter_id = e.id
      WHERE 1=1 ${statusFilter} ${patientFilter} ${doctorFilter}
      ORDER BY e.created_at ASC
    `;
    
    const encounters = await req.prisma.$queryRawUnsafe(query);

    // --- QUEUE WAIT TIME ENGINE ---
    const doctorQueues = {};
    encounters.forEach(enc => {
      if (!doctorQueues[enc.doctor_id]) doctorQueues[enc.doctor_id] = [];
      doctorQueues[enc.doctor_id].push(enc);
    });

    Object.keys(doctorQueues).forEach(docId => {
      let cumulativeWait = 0;
      const queue = doctorQueues[docId]; // Already sorted by created_at ASC in SQL
      
      queue.forEach((enc) => {
        if (enc.latest_event === 'CONSULT_START') {
          const elapsed = (Date.now() - new Date(enc.start_time).getTime()) / 60000;
          const remaining = Math.max(0, (enc.predicted_time_mins || 15) - elapsed);
          enc.predicted_wait_time = 0;
          cumulativeWait = remaining;
          enc.is_in_consultation = true;
        } else if (enc.latest_event === 'CONSULT_END' || enc.status === 'Completed') {
          enc.predicted_wait_time = 0;
          enc.is_finished = true;
        } else {
          enc.predicted_wait_time = Math.round(cumulativeWait);
          cumulativeWait += (enc.predicted_time_mins || 15);
          enc.is_waiting = true;
        }
      });
    });

    res.json(encounters);
  } catch (error) { 
    console.error("[GET_ENCOUNTERS] Error:", error.message);
    next(error); 
  }
});

// --- IPD / BED MANAGEMENT ---
router.get("/ipd/bedmap", async (req, res, next) => {
  try {
    await ensureIPDMasters(req);
    const wards = await req.prisma.$queryRawUnsafe(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM "${req.schemaName}".beds b WHERE b.ward_id = w.id AND b.status = 'Occupied') as occupied
      FROM "${req.schemaName}".wards w
    `);
    res.json(wards);
  } catch (error) { next(error); }
});

router.get("/ipd/wards/:id/beds", async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT b.*, p.name as patient_name, p.mrn, adm.id as admission_id
      FROM "${req.schemaName}".beds b
      LEFT JOIN "${req.schemaName}".ipd_admissions adm ON b.id = adm.bed_id AND adm.status = 'Admitted'
      LEFT JOIN "${req.schemaName}".patients p ON adm.patient_id = p.id
      WHERE b.ward_id = '${id}'
      ORDER BY b.bed_number ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/ipd/wards/:id/provision-beds", async (req, res, next) => {
  try {
    const { id } = req.params;
    const wards = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".wards WHERE id = '${id}'`);
    if (!wards.length) return res.status(404).json({ error: "Ward not found" });
    const ward = wards[0];
    const capacity = parseInt(ward.capacity) || 10;

    // Add unique constraint idempotently to avoid duplicates
    try {
      await req.prisma.$executeRawUnsafe(`
        ALTER TABLE "${req.schemaName}".beds 
        ADD CONSTRAINT beds_ward_bed_unique UNIQUE (ward_id, bed_number)
      `);
    } catch (e) { /* Constraint already exists — safe to ignore */ }

    // Provision beds that don't already exist
    for (let i = 1; i <= capacity; i++) {
      const bedNum = `${ward.name.substring(0, 2).toUpperCase()}-${String(i).padStart(2, '0')}`;
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".beds (ward_id, bed_number, status)
        VALUES ('${id}', '${bedNum}', 'Vacant')
        ON CONFLICT (ward_id, bed_number) DO NOTHING
      `);
    }
    res.json({ success: true, message: `Provisioned up to ${capacity} beds for ward.` });
  } catch (error) { next(error); }
});

router.post("/ipd/admissions", async (req, res, next) => {
  try {
    await ensureIPDAdmissionsTable(req);
    await ensureBillingQueue(req);
    const { patientId, bedId, wardId, admittingDoctorId, admissionReason, dailyCharge } = req.body;
    
    // 1. Create Admission Record
    const admId = crypto.randomUUID();
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".ipd_admissions (id, patient_id, bed_id, ward_id, admitting_doctor_id, admission_reason, daily_charge, status)
      VALUES ('${admId}', '${patientId}', '${bedId}', '${wardId}', '${admittingDoctorId}', '${s(admissionReason)}', ${dailyCharge}, 'Admitted')
    `);

    // 2. Update Bed Status
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".beds SET status = 'Occupied' WHERE id = '${bedId}'`);

    // 3. Push Admission Fee to Billing Queue
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".billing_queue (patient_id, source_module, source_id, description, quantity, unit_price)
      VALUES ('${patientId}', 'IPD', '${admId}', 'Admission Charges', 1, 1500)
    `);

    res.status(201).json({ id: admId });
  } catch (error) { next(error); }
});

router.get("/ipd/admissions", async (req, res, next) => {
  try {
    await ensureIPDAdmissionsTable(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, p.mrn, p.age, p.gender, p.phone, w.name as ward_name, b.bed_number, u.name as doctor_name
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      LEFT JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
      LEFT JOIN "${req.schemaName}".beds b ON a.bed_id = b.id
      LEFT JOIN "${req.schemaName}".users u ON a.admitting_doctor_id = u.id
      WHERE a.status = 'Admitted'
      ORDER BY a.admitted_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// GET single admission (for IPDPatientView)
router.get("/ipd/admissions/:id", async (req, res, next) => {
  try {
    await ensureIPDAdmissionsTable(req);
    const { id } = req.params;
    const admissions = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, p.mrn, p.age, p.gender, p.phone, p.blood_group, p.allergies,
             w.name as ward_name, b.bed_number, u.name as doctor_name
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      LEFT JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
      LEFT JOIN "${req.schemaName}".beds b ON a.bed_id = b.id
      LEFT JOIN "${req.schemaName}".users u ON a.admitting_doctor_id = u.id
      WHERE a.id = '${id}'
    `);
    if (!admissions.length) return res.status(404).json({ error: "Admission not found" });

    const notes = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".ipd_notes
      WHERE admission_id = '${id}'
      ORDER BY created_at DESC
    `);

    // Check for discharge summary
    let dischargeSummary = null;
    try {
      const ds = await req.prisma.$queryRawUnsafe(`
        SELECT * FROM "${req.schemaName}".discharge_summaries
        WHERE admission_id = '${id}'
        ORDER BY created_at DESC LIMIT 1
      `);
      dischargeSummary = ds[0] || null;
    } catch (e) { /* table may not exist yet */ }

    res.json({ admission: admissions[0], notes, dischargeSummary });
  } catch (error) { next(error); }
});

// POST clinical note for an IPD admission
router.post("/ipd/admissions/:id/notes", async (req, res, next) => {
  try {
    await ensureIPDAdmissionsTable(req);
    const { id } = req.params;
    const { noteText, noteType } = req.body;
    const doctorId = await getCurrentUserId(req);
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".ipd_notes (admission_id, note_text, note_type, doctor_id, doctor_name)
      VALUES ('${id}', '${s(noteText)}', '${s(noteType || 'Progress')}',
        ${doctorId ? `'${doctorId}'` : 'NULL'},
        (SELECT name FROM "${req.schemaName}".users WHERE id = ${doctorId ? `'${doctorId}'` : 'NULL'} LIMIT 1)
      )
    `);
    res.json({ success: true, message: "Clinical note saved." });
  } catch (error) { next(error); }
});

// POST AI Discharge Summary generation
router.post("/ipd/admissions/:id/generate-summary", async (req, res, next) => {
  try {
    await ensureIPDAdmissionsTable(req);
    await ensureDischargeTable(req);
    const { id } = req.params;
    const admissions = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, p.mrn, p.allergies, p.medical_history
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      WHERE a.id = '${id}'
    `);
    if (!admissions.length) return res.status(404).json({ error: "Admission not found" });
    const adm = admissions[0];

    const notes = await req.prisma.$queryRawUnsafe(
      `SELECT note_text FROM "${req.schemaName}".ipd_notes WHERE admission_id = '${id}' ORDER BY created_at ASC`
    );
    const notesSummary = notes.map(n => n.note_text).join('\n');

    let summaryText = `DISCHARGE SUMMARY\n\nPatient: ${adm.patient_name} (${adm.mrn})\nAdmission Reason: ${adm.admission_reason}\n\nClinical Notes:\n${notesSummary || 'No notes recorded.'}\n\nDischarge Condition: Stable`;
    try {
      const aiService = require('../../services/aiService');
      const generated = await aiService.generateDischargeSummary(adm, notes);
      if (generated && !generated.error) summaryText = generated;
    } catch (e) { console.warn('[IPD] AI summary unavailable, using template.'); }

    // Upsert discharge summary draft
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".discharge_summaries (admission_id, patient_id, summary_text, discharge_type, status)
      VALUES ('${id}', '${adm.patient_id}', '${s(summaryText)}', 'STANDARD', 'Draft')
      ON CONFLICT (admission_id) DO UPDATE SET summary_text = '${s(summaryText)}', status = 'Draft'
    `);

    res.json({ summaryText, message: 'AI discharge summary generated.' });
  } catch (error) { next(error); }
});

async function ensureAdmissionRecommendations(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".admission_recommendations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      encounter_id UUID NOT NULL,
      patient_id UUID NOT NULL,
      doctor_id UUID NOT NULL,
      reason TEXT,
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// --- CLINICAL ORDERS (LAB & PHARMACY & ADMISSION) ---
router.post("/encounters/:id/admission-recommendation", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await ensureAdmissionRecommendations(req);

    const encounter = await req.prisma.$queryRawUnsafe(`SELECT patient_id, doctor_id FROM "${req.schemaName}".encounters WHERE id = '${id}'`);
    if (encounter.length === 0) return res.status(404).json({ error: "Encounter not found" });
    
    const { patient_id, doctor_id } = encounter[0];

    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".admission_recommendations (encounter_id, patient_id, doctor_id, reason, status)
      VALUES ('${id}', '${patient_id}', '${doctor_id}', '${s(reason)}', 'Pending')
    `);

    res.json({ message: "Admission recommendation registered." });
  } catch (error) { next(error); }
});

router.get("/ipd/recommendations", async (req, res, next) => {
  try {
    await ensureAdmissionRecommendations(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT r.*, p.name as patient_name, p.mrn, u.name as doctor_name
      FROM "${req.schemaName}".admission_recommendations r
      JOIN "${req.schemaName}".patients p ON r.patient_id = p.id
      JOIN "${req.schemaName}".users u ON r.doctor_id = u.id
      WHERE r.status = 'Pending'
      ORDER BY r.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/encounters/:id/prescriptions", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    await ensureOrderColumns(req);
    await ensureBillingQueue(req);

    const encounter = await req.prisma.$queryRawUnsafe(`SELECT patient_id FROM "${req.schemaName}".encounters WHERE id = '${id}'`);
    if (!encounter.length) return res.status(404).json({ error: "Encounter not found" });
    const patientId = encounter[0].patient_id;

    // 1. Create Prescription Header
    const presHeader = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".prescriptions (encounter_id, status)
      VALUES ('${id}', 'Pending')
      RETURNING id
    `);
    const presId = presHeader[0].id;

    // 2. Create Prescription Items & Billing
    for (const item of items) {
      // Find medicine for pricing
      const med = await req.prisma.$queryRawUnsafe(`SELECT id, unit_price FROM "${req.schemaName}".medicines WHERE name ILIKE '%${s(item.name)}%' LIMIT 1`);
      const medicineId = med[0]?.id || null;
      const price = med[0]?.unit_price || 100;

      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".prescription_items (prescription_id, medicine_id, drug_name, dosage, frequency, duration, instructions)
        VALUES ('${presId}', ${medicineId ? `'${medicineId}'` : 'NULL'}, '${s(item.name)}', '${s(item.dosage)}', '${s(item.frequency)}', '${s(item.duration)}', '${s(item.instructions)}')
      `);

      // Push to Billing Queue
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, quantity, unit_price)
        VALUES ('${patientId}', '${id}', 'PHARMACY', '${presId}', 'Medicine: ${s(item.name)}', 1, ${price})
      `);
    }
    res.json({ message: "Prescriptions saved and billed.", prescriptionId: presId });
  } catch (error) { 
    console.error("[PRESCRIPTION_POST_ERROR]", error.message);
    next(error); 
  }
});

router.post("/encounters/:id/lab-orders", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosticIds, priority } = req.body;
    await ensureOrderColumns(req);
    await ensureBillingQueue(req);

    const encounter = await req.prisma.$queryRawUnsafe(`SELECT patient_id, doctor_id FROM "${req.schemaName}".encounters WHERE id = '${id}'`);
    if (!encounter.length) return res.status(404).json({ error: "Encounter not found" });
    const patientId = encounter[0].patient_id;
    const doctorId = encounter[0].doctor_id;

    for (const testId of diagnosticIds) {
      const orderId = crypto.randomUUID();
      const diag = await req.prisma.$queryRawUnsafe(`SELECT name, price FROM "${req.schemaName}".diagnostics WHERE id::text = '${testId}' OR name = '${testId}' LIMIT 1`);
      const testName = diag[0]?.name || testId;
      const price = diag[0]?.price || 500;

      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".lab_orders (id, encounter_id, patient_id, doctor_id, test_name, priority, status)
        VALUES ('${orderId}', '${id}', '${patientId}', '${doctorId}', '${s(testName)}', '${s(priority || 'Normal')}', 'Pending')
      `);

      // Push to Billing Queue
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, quantity, unit_price)
        VALUES ('${patientId}', '${id}', 'LAB', '${orderId}', 'Lab: ${s(testName)}', 1, ${price})
      `);
    }
    res.json({ message: "Lab orders saved and billed." });
  } catch (error) { 
    console.error("[LAB_ORDER_POST_ERROR]", error.message);
    next(error); 
  }
});

router.post("/lab/upload-external", upload.single("lab_report"), async (req, res, next) => {
  try {
    const { patientId } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let extractedText = "Extracted data...";
    try {
      if (req.file.mimetype === 'application/pdf') {
        extractedText = await pdfService.extractTextFromPDF(req.file.path);
      } else {
        extractedText = "Simulated extraction from image.";
      }
    } catch (e) {
      console.warn("Could not extract text:", e.message);
    }

    let aiResponse = { noteText: "AI Engine parsed the report successfully.\\n\\nKey findings:\\n- Hemoglobin: 12.5 g/dL (Normal)\\n- WBC: 8,500/cumm (Normal)\\n\\n(Simulation output: " + extractedText.substring(0, 150) + "...)" };
    try {
      if (aiService.parseExternalLabReport) {
        const parsed = await aiService.parseExternalLabReport(req.file.path);
        if (parsed) aiResponse = parsed;
      }
    } catch (e) {}

    const fs = require('fs');
    try {
      fs.unlinkSync(req.file.path);
    } catch(e) {}

    res.json(aiResponse);
  } catch (error) { next(error); }
});

router.get("/lab/orders", async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT lo.*, 
             COALESCE(p.name, 'Unknown') as patient_name, 
             p.mrn, 
             COALESCE(u.name, 'Staff') as doctor_name
      FROM "${req.schemaName}".lab_orders lo
      LEFT JOIN "${req.schemaName}".patients p ON lo.patient_id = p.id
      LEFT JOIN "${req.schemaName}".users u ON lo.doctor_id = u.id
      ORDER BY lo.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.put("/lab/orders/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".lab_orders SET status = '${s(status)}' WHERE id = '${id}'`);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post("/lab/orders/:id/results", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { results, technicianNote } = req.body;
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".lab_orders 
      SET results = ${jsonValue(results)}, technician_notes = '${s(technicianNote)}', status = 'Completed' 
      WHERE id = '${id}'
    `);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post("/lab/orders/:id/publish", async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".lab_orders SET status = 'Published' WHERE id = '${id}'`);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// --- IPD ROUNDS & SERVICE POSTING ---
router.post("/ipd/admissions/:id/service-charges", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, amount, quantity } = req.body;
    
    const adm = await req.prisma.$queryRawUnsafe(`SELECT patient_id FROM "${req.schemaName}".ipd_admissions WHERE id = '${id}'`);
    if (adm.length === 0) return res.status(404).json({ error: "Admission not found" });

    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".billing_queue (patient_id, source_module, source_id, description, quantity, unit_price)
      VALUES ('${adm[0].patient_id}', 'IPD_SERVICE', '${id}', '${s(description)}', ${quantity || 1}, ${amount})
    `);

    res.json({ success: true, message: "Service charges posted to bill." });
  } catch (error) { next(error); }
});

router.post("/ipd/admissions/:id/discharge", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { summary, dischargeType } = req.body;
    
    // 1. Get Admission Details
    const adms = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, w.base_charge 
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
      WHERE a.id = '${id}'
    `);
    const adm = adms[0];
    if (!adm) return res.status(404).json({ error: "Admission not found" });

    // 2. CHECK CLEARANCES (Discharge Checklist)
    if (!adm.pharmacy_cleared || !adm.billing_cleared || !adm.clinical_cleared) {
      return res.status(400).json({ error: "Cannot discharge. All clearances (Pharmacy, Billing, Clinical) must be completed." });
    }

    // 3. Calculate Days and Room Charges
    const stayMs = new Date().getTime() - new Date(adm.admitted_at).getTime();
    const days = Math.max(1, Math.ceil(stayMs / (1000 * 60 * 60 * 24)));
    const roomCharge = days * (adm.daily_charge || adm.base_charge || 1000);

    // 4. Post Room Charges to Billing Queue
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".billing_queue (patient_id, source_module, source_id, description, quantity, unit_price)
      VALUES ('${adm.patient_id}', 'IPD_ROOM', '${id}', 'Room Charges (${days} Days in ${adm.ward_id})', 1, ${roomCharge})
    `);

    // 5. Create Discharge Summary
    await ensureDischargeTable(req);
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".discharge_summaries (admission_id, patient_id, summary_text, discharge_type, status)
      VALUES ('${id}', '${adm.patient_id}', '${s(summary)}', '${s(dischargeType)}', 'Final')
    `);

    // 6. Free the Bed & Update Admission Status
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".beds SET status = 'Vacant' WHERE id = '${adm.bed_id}'`);
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".ipd_admissions SET status = 'Discharged', discharged_at = NOW() WHERE id = '${id}'`);

    res.json({ success: true, message: "Patient discharged and bill finalized." });
  } catch (error) { next(error); }
});

router.post("/ipd/admissions/:id/transfer", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newBedId, newWardId } = req.body;
    await ensureIPDAdmissionsTable(req);
    await ensureBillingQueue(req);

    const adms = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, w.base_charge, w.name as ward_name
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
      WHERE a.id = '${id}'
    `);
    const adm = adms[0];
    if (!adm) return res.status(404).json({ error: "Admission not found" });

    const stayMs = new Date().getTime() - new Date(adm.admitted_at).getTime();
    const days = Math.max(1, Math.ceil(stayMs / (1000 * 60 * 60 * 24)));
    const roomCharge = days * (adm.daily_charge || adm.base_charge || 1000);

    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".billing_queue (patient_id, source_module, source_id, description, quantity, unit_price)
      VALUES ('${adm.patient_id}', 'IPD_ROOM', '${id}', 'Room Charges (${days} Days in ${s(adm.ward_name)})', 1, ${roomCharge})
    `);

    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".beds SET status = 'Vacant' WHERE id = '${adm.bed_id}'`);
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".beds SET status = 'Occupied' WHERE id = '${newBedId}'`);

    const newWards = await req.prisma.$queryRawUnsafe(`SELECT base_charge FROM "${req.schemaName}".wards WHERE id = '${newWardId}'`);
    const newCharge = newWards[0]?.base_charge || 1000;

    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".ipd_admissions 
      SET ward_id = '${newWardId}', 
          bed_id = '${newBedId}', 
          daily_charge = ${newCharge},
          admitted_at = NOW() 
      WHERE id = '${id}'
    `);

    res.json({ success: true, message: "Patient transferred successfully." });
  } catch (error) { next(error); }
});

router.post("/ipd/admissions/:id/clearance", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, status } = req.body;
    
    if (!['pharmacy', 'billing', 'clinical'].includes(type)) {
      return res.status(400).json({ error: "Invalid clearance type" });
    }

    const field = `${type}_cleared`;
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".ipd_admissions 
      SET ${field} = ${status} 
      WHERE id = '${id}'
    `);

    res.json({ success: true, message: `${type} clearance updated.` });
  } catch (error) { next(error); }
});

router.get("/ipd/discharges", async (req, res, next) => {
  try {
    await ensureDischargeTable(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT ds.*, p.name as patient_name, p.mrn, u.name as doctor_name
      FROM "${req.schemaName}".discharge_summaries ds
      JOIN "${req.schemaName}".patients p ON ds.patient_id = p.id
      LEFT JOIN "${req.schemaName}".users u ON ds.doctor_id = u.id
      ORDER BY ds.discharge_date DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/ipd/discharges/:id", async (req, res, next) => {
  try {
    await ensureDischargeTable(req);
    const { id } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT ds.*, p.name as patient_name, p.mrn, u.name as doctor_name
      FROM "${req.schemaName}".discharge_summaries ds
      JOIN "${req.schemaName}".patients p ON ds.patient_id = p.id
      LEFT JOIN "${req.schemaName}".users u ON ds.doctor_id = u.id
      WHERE ds.id = '${id}'
    `);
    if (!data.length) return res.status(404).json({ error: "Summary not found" });
    res.json(data[0]);
  } catch (error) { next(error); }
});

router.put("/ipd/discharges/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { summary_text, is_authenticated } = req.body;
    const doctorId = await getCurrentUserId(req);
    
    let updateFields = `summary_text = '${s(summary_text)}'`;
    if (is_authenticated !== undefined) {
      updateFields += `, is_authenticated = ${is_authenticated}, status = '${is_authenticated ? 'Authenticated' : 'Draft'}'`;
      if (is_authenticated) {
        updateFields += `, authenticated_at = NOW()`;
      }
    }
    if (doctorId) {
      updateFields += `, doctor_id = '${doctorId}'`;
    }

    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".discharge_summaries 
      SET ${updateFields}
      WHERE id = '${id}'
    `);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// --- PHARMACY MANAGEMENT ---
router.get("/pharmacy/inventory", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".medicines ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/inventory", async (req, res, next) => {
  try {
    const { name, category, quantity, price, expiryDate } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".medicines (name, category, stock_quantity, unit_price, expiry_date, is_active)
      VALUES ('${s(name)}', '${s(category)}', ${parseInt(quantity) || 0}, ${parseFloat(price) || 0}, ${sqlValue(expiryDate)}, true)
    `);
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

router.get("/pharmacy/prescriptions", async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT p.*, pat.name as patient_name, pat.mrn, pat.id as patient_id,
             COALESCE(u.name, 'IPD Staff') as doctor_name
      FROM "${req.schemaName}".prescriptions p
      LEFT JOIN "${req.schemaName}".encounters e ON p.encounter_id = e.id
      LEFT JOIN "${req.schemaName}".patients pat ON e.patient_id = pat.id
      LEFT JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/pharmacy/prescriptions/:id/items", async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT pi.*, m.name as medicine_name, m.unit_price
      FROM "${req.schemaName}".prescription_items pi
      LEFT JOIN "${req.schemaName}".medicines m ON pi.medicine_id = m.id
      WHERE pi.prescription_id = '${id}'
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/dispense", async (req, res, next) => {
  try {
    const { prescriptionId, items, encounterId } = req.body;
    await ensureBillingQueue(req);

    for (const item of items) {
      // 1. FEFO Stock Decrement (First Expired, First Out)
      let qtyNeeded = parseInt(item.quantity) || 0;
      
      const batches = await req.prisma.$queryRawUnsafe(`
        SELECT id, current_stock 
        FROM "${req.schemaName}".pharmacy_inwards 
        WHERE medicine_id = '${item.drugId}' AND current_stock > 0 AND is_blocked = FALSE
        ORDER BY expiry_date ASC
      `);

      for (const batch of batches) {
        if (qtyNeeded <= 0) break;
        const consume = Math.min(qtyNeeded, batch.current_stock);
        await req.prisma.$executeRawUnsafe(`
          UPDATE "${req.schemaName}".pharmacy_inwards 
          SET current_stock = current_stock - ${consume} 
          WHERE id = '${batch.id}'
        `);
        qtyNeeded -= consume;
      }

      await req.prisma.$executeRawUnsafe(`
        UPDATE "${req.schemaName}".medicines 
        SET stock_quantity = GREATEST(0, stock_quantity - ${item.quantity}) 
        WHERE id = '${item.drugId}' OR name ILIKE '${s(item.drugName)}'
      `);

      // 2. Resolve patient ID — from encounter OR from prescription's admission
      let patientId = null;
      if (encounterId && encounterId !== 'undefined') {
        const encounter = await req.prisma.$queryRawUnsafe(`SELECT patient_id FROM "${req.schemaName}".encounters WHERE id = '${encounterId}'`);
        patientId = encounter[0]?.patient_id;
      }
      // Fallback: find patient via prescription → ipd_admissions
      if (!patientId && prescriptionId) {
        const pres = await req.prisma.$queryRawUnsafe(`
          SELECT e.patient_id
          FROM "${req.schemaName}".prescriptions p
          LEFT JOIN "${req.schemaName}".encounters e ON p.encounter_id = e.id
          WHERE p.id = '${prescriptionId}'
        `);
        patientId = pres[0]?.patient_id;
      }

      if (patientId) {
        await req.prisma.$executeRawUnsafe(`
          INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, quantity, unit_price)
          VALUES ('${patientId}', ${encounterId && encounterId !== 'undefined' ? `'${encounterId}'` : 'NULL'}, 'PHARMACY', '${prescriptionId || crypto.randomUUID()}', 'Medicine: ${s(item.drugName)}', ${item.quantity}, ${item.unitPrice})
        `);
      }
    }

    // 3. Mark Prescription as Completed
    if (prescriptionId) {
      await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".prescriptions SET status = 'Completed', is_paid = true WHERE id = '${prescriptionId}'`);
    }

    res.json({ success: true, message: "Medicines dispensed and billing updated." });
  } catch (error) { next(error); }
});

router.get("/pharmacy/stats", async (req, res, next) => {
  try {
    const todaysSalesRes = await req.prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(total), 0)::float as total 
      FROM "${req.schemaName}".invoices 
      WHERE bill_type = 'PHARMACY' AND created_at > NOW() - INTERVAL '24 hours'
    `);
    
    const recentDispenses = await req.prisma.$queryRawUnsafe(`
      SELECT p.*, pat.name as patient_name 
      FROM "${req.schemaName}".prescriptions p
      JOIN "${req.schemaName}".encounters e ON p.encounter_id = e.id
      JOIN "${req.schemaName}".patients pat ON e.patient_id = pat.id
      WHERE p.status = 'Completed'
      ORDER BY p.created_at DESC LIMIT 5
    `);

    res.json({
      todaysSales: todaysSalesRes[0]?.total || 0,
      recentDispenses
    });
  } catch (error) { next(error); }
});

// --- PHARMACY INWARD REGISTER (GRN) ---
async function ensureInwardsTable(req) {
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".pharmacy_inwards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inward_no VARCHAR(50),
      supplier_id UUID,
      medicine_id UUID,
      batch_number VARCHAR(100),
      invoice_number VARCHAR(100),
      quantity INTEGER DEFAULT 0,
      uom VARCHAR(50),
      purchase_price NUMERIC DEFAULT 0,
      mrp NUMERIC DEFAULT 0,
      mfd_date DATE,
      expiry_date DATE,
      received_at TIMESTAMP DEFAULT NOW(),
      is_blocked BOOLEAN DEFAULT FALSE,
      remarks TEXT
    )
  `);
  // Schema Healing: Add current_stock for FEFO tracking
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".pharmacy_inwards ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0`);
}

router.get("/pharmacy/inwards", async (req, res, next) => {
  try {
    await ensureInwardsTable(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT i.*, s.name as supplier_name, m.name as medicine_name
      FROM "${req.schemaName}".pharmacy_inwards i
      LEFT JOIN "${req.schemaName}".suppliers s ON i.supplier_id = s.id
      LEFT JOIN "${req.schemaName}".medicines m ON i.medicine_id = m.id
      ORDER BY i.received_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/inwards", async (req, res, next) => {
  try {
    await ensureInwardsTable(req);
    const { supplier_id, medicine_id, batch_number, invoice_number, quantity, uom, purchase_price, mrp, mfd_date, expiry_date, remarks, inward_no } = req.body;
    
    const finalInwardNo = inward_no || `GRN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Record the Inward Entry
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".pharmacy_inwards 
      (inward_no, supplier_id, medicine_id, batch_number, invoice_number, quantity, current_stock, uom, purchase_price, mrp, mfd_date, expiry_date, remarks)
      VALUES (
        '${s(finalInwardNo)}',
        ${supplier_id ? `'${supplier_id}'` : 'NULL'}, 
        ${medicine_id ? `'${medicine_id}'` : 'NULL'}, 
        '${s(batch_number)}', '${s(invoice_number)}', 
        ${parseInt(quantity) || 0}, ${parseInt(quantity) || 0}, '${s(uom)}', 
        ${parseFloat(purchase_price) || 0}, ${parseFloat(mrp) || 0},
        ${sqlValue(mfd_date)}, ${sqlValue(expiry_date)}, '${s(remarks || '')}'
      )
    `);

    // 2. AUTO-UPDATE MEDICINE STOCK
    if (medicine_id) {
      await req.prisma.$executeRawUnsafe(`
        UPDATE "${req.schemaName}".medicines 
        SET stock_quantity = stock_quantity + ${parseInt(quantity) || 0},
            unit_price = ${parseFloat(mrp) || 0},
            expiry_date = ${sqlValue(expiry_date)},
            batch_number = '${s(batch_number)}'
        WHERE id = '${medicine_id}'
      `);
    }

    res.json({ success: true, message: "Stock inward registered and inventory updated." });
  } catch (error) { next(error); }
});

router.patch("/pharmacy/inwards/:id/block", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_blocked } = req.body;
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".pharmacy_inwards SET is_blocked = ${is_blocked} WHERE id = '${id}'`);
    res.json({ success: true, message: is_blocked ? "Batch blocked for distribution" : "Batch unblocked" });
  } catch (error) { next(error); }
});

// --- INSURANCE & TPA MANAGEMENT ---
router.get("/insurance/providers", async (req, res, next) => {
  try {
    await ensureInsuranceInfrastructure(req);
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".insurance_providers ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/insurance/providers", async (req, res, next) => {
  try {
    await ensureInsuranceInfrastructure(req);
    const { name, tpa_name, contact_person, email } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".insurance_providers (name, tpa_name, contact_person, email)
      VALUES ('${s(name)}', '${s(tpa_name)}', ${sqlValue(contact_person)}, ${sqlValue(email)})
    `);
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

router.get("/insurance/plans", async (req, res, next) => {
  try {
    await ensureInsuranceInfrastructure(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT p.*, ip.name as provider_name 
      FROM "${req.schemaName}".insurance_plans p
      JOIN "${req.schemaName}".insurance_providers ip ON p.provider_id = ip.id
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/insurance/plans", async (req, res, next) => {
  try {
    await ensureInsuranceInfrastructure(req);
    const { provider_id, plan_name, description, base_coverage, copay_percent } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".insurance_plans (provider_id, plan_name, description, base_coverage, copay_percent)
      VALUES ('${provider_id}', '${s(plan_name)}', ${sqlValue(description)}, ${base_coverage || 0}, ${copay_percent || 0})
    `);
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

router.get("/insurance/patient-mapping", async (req, res, next) => {
  try {
    await ensureInsuranceInfrastructure(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT pi.*, p.name as patient_name, p.mrn, ip.name as provider_name, ipl.plan_name
      FROM "${req.schemaName}".patient_insurance pi
      JOIN "${req.schemaName}".patients p ON pi.patient_id = p.id
      JOIN "${req.schemaName}".insurance_providers ip ON pi.provider_id = ip.id
      JOIN "${req.schemaName}".insurance_plans ipl ON pi.plan_id = ipl.id
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/insurance/patient-mapping", async (req, res, next) => {
  try {
    await ensureInsuranceInfrastructure(req);
    const { patient_id, provider_id, plan_id, policy_number, total_limit, copay_percent, valid_till } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".patient_insurance (patient_id, provider_id, plan_id, policy_number, total_limit, remaining_limit, copay_percent, valid_till)
      VALUES ('${patient_id}', '${provider_id}', '${plan_id}', '${s(policy_number)}', ${total_limit}, ${total_limit}, ${copay_percent || 0}, ${sqlValue(valid_till)})
    `);
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

router.get("/insurance/claims", async (req, res, next) => {
  try {
    await ensureInsuranceInfrastructure(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT ic.*, p.name as patient_name, p.mrn, ip.name as provider_name
      FROM "${req.schemaName}".insurance_claims ic
      JOIN "${req.schemaName}".patients p ON ic.patient_id = p.id
      JOIN "${req.schemaName}".insurance_providers ip ON ic.provider_id = ip.id
      ORDER BY ic.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/ai/chat", async (req, res, next) => {
  try {
    const { messages } = req.body;
    
    let totalPatients = 0;
    let activeAdmissions = 0;
    let pendingLabs = 0;

    try {
      const totalPatientsRes = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::integer as count FROM "${req.schemaName}".patients`);
      totalPatients = totalPatientsRes[0]?.count || 0;
    } catch (e) {}

    try {
      const activeAdmissionsRes = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::integer as count FROM "${req.schemaName}".ipd_admissions WHERE status = 'Admitted'`);
      activeAdmissions = activeAdmissionsRes[0]?.count || 0;
    } catch (e) {}

    try {
      const pendingLabsRes = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::integer as count FROM "${req.schemaName}".lab_orders WHERE status = 'Pending'`);
      pendingLabs = pendingLabsRes[0]?.count || 0;
    } catch (e) {}

    const hospitalContext = {
      hospitalName: req.tenantName || "Healthezee Hospital",
      stats: {
        totalPatients,
        activeAdmissions,
        pendingLabs
      }
    };

    const aiService = require('../../services/aiService');
    const response = await aiService.hospitalChat(messages, hospitalContext);
    
    res.json({ response });
  } catch (error) { next(error); }
});

module.exports = router;
