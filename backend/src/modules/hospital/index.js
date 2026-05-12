const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { checkPermission } = require("../../middleware/rbac");
const metricsRoutes = require("./metrics");
const aiService = require("../../services/aiService");
const pdfService = require("../../services/pdfService");
const bcrypt = require("bcryptjs");

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
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS instructions TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS medicine_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS results JSONB`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS technician_notes TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false`);
}

async function ensureStaffColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS dob DATE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS doj DATE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS qualifications TEXT`);

  await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".users SET is_active = true WHERE is_active IS NULL OR is_active = false`);
  
  const activeDoctors = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".users WHERE (role = 'DOCTOR' OR name ILIKE 'Dr.%') AND is_active = true`);
  
  if (activeDoctors[0].count === 0) {
    const staffTemplate = [
      { name: 'Dr. Sankaran R', email: 'sankaran@apollo.com', role: 'DOCTOR', spec: 'Cardiology', dept: 'Cardiology' },
      { name: 'Dr. Maheswaran R', email: 'maheswaran@apollo.com', role: 'DOCTOR', spec: 'Orthopedics', dept: 'Orthopedics' },
      { name: 'Dr. Aravind Kumar', email: 'aravind@apollo.com', role: 'DOCTOR', spec: 'Pediatrics', dept: 'Pediatrics' }
    ];
    for (const s of staffTemplate) {
      const id = crypto.randomUUID();
      const pwd = await require('bcryptjs').hash('password123', 10);
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".users (id, name, email, password_hash, role, specialization, department, is_active)
        VALUES ('${id}', '${s.name}', '${s.email}', '${pwd}', '${s.role}', '${s.spec}', '${s.dept}', true)
      `);
    }
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
  } catch (e) {}
}

async function ensureIPDMasters(req) {
  await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${req.schemaName}".wards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100), type VARCHAR(50), capacity INTEGER DEFAULT 0, base_charge NUMERIC DEFAULT 0)`);
  await ensureTableColumns(req, 'wards');
  await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${req.schemaName}".beds (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ward_id UUID REFERENCES "${req.schemaName}".wards(id), bed_number VARCHAR(50), status VARCHAR(50) DEFAULT 'Vacant')`);
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

// --- METRICS ---
router.use("/metrics", metricsRoutes);

// --- GLOBAL HEAL UTILITY ---
router.get("/heal-all-masters", async (req, res, next) => {
  try {
    await ensureStaffColumns(req);
    await ensurePatientColumns(req);
    await ensureIPDMasters(req);
    await ensureIPDAdmissionsTable(req);
    await ensureEncounterTable(req);
    await ensureOrderColumns(req);
    await ensureDischargeTable(req);
    await ensureBillingQueue(req);
    await ensureInsuranceInfrastructure(req);
    res.json({ success: true, message: "Clinical environment provisioned." });
  } catch (error) { next(error); }
});

// --- DOCTOR LIST (Clinical Staff Only) ---
router.get("/doctors", async (req, res, next) => {
  try {
    await ensureStaffColumns(req);
    // Show only Active Doctors or users with Dr. in their name
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, role, specialization, department 
      FROM "${req.schemaName}".users 
      WHERE (role = 'DOCTOR' OR name ILIKE 'Dr.%') AND is_active = true
      ORDER BY name ASC
    `);
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
  { path: 'wards', table: 'wards' }
];

masterTables.forEach(({ path, table }) => {
  router.get(`/masters/${path}`, async (req, res, next) => {
    try {
      await ensureTableColumns(req, table);
      const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}"."${table}"`);
      res.json(data);
    } catch (error) { next(error); }
  });

  router.post(`/masters/${path}`, async (req, res, next) => {
    try {
      await ensureTableColumns(req, table);
      const fields = Object.keys(req.body).filter(f => ['name','description','category','price','unit_price','stock_quantity','expiry_date','hod','specialty','status'].includes(f));
      const values = fields.map(f => typeof req.body[f] === 'string' ? `'${req.body[f].replace(/'/g, "''")}'` : req.body[f]);
      const query = `INSERT INTO "${req.schemaName}"."${table}" (${fields.join(',')}) VALUES (${values.join(',')}) RETURNING *`;
      const result = await req.prisma.$queryRawUnsafe(query);
      res.status(201).json(result[0]);
    } catch (error) { next(error); }
  });

  router.post(`/masters/${path}/bulk`, async (req, res, next) => {
    try {
      await ensureTableColumns(req, table);
      const items = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      for (const item of items) {
        const fields = Object.keys(item).filter(f => ['name','description','category','price','unit_price','stock_quantity','expiry_date','hod','specialty','status'].includes(f));
        const values = fields.map(f => typeof item[f] === 'string' ? `'${item[f].replace(/'/g, "''")}'` : item[f]);
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
    const { diagnosis, status, notes } = req.body;
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".encounters 
      SET diagnosis = '${s(diagnosis)}', status = '${s(status)}', notes = '${s(notes)}'
      WHERE id = '${id}'
    `);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.get("/encounters", async (req, res, next) => {
  try {
    await ensureEncounterTable(req);
    const status = req.query.status || 'Active';
    const patientId = req.query.patientId;
    const patientFilter = patientId ? `AND e.patient_id = '${patientId}'` : '';
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT e.*, p.name as patient_name, p.mrn, u.name as doctor_name 
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      WHERE e.status = '${status}' ${patientFilter}
      ORDER BY e.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
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
    const patientId = encounter[0]?.patient_id;

    for (const item of items) {
      const presId = crypto.randomUUID();
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".prescriptions (id, encounter_id, medicine_name, dosage, frequency, duration, instructions, status)
        VALUES ('${presId}', '${id}', '${s(item.name)}', '${s(item.dosage)}', '${s(item.frequency)}', '${s(item.duration)}', '${s(item.instructions)}', 'Pending')
      `);

      // Push to Billing Queue (Estimate Price if possible)
      const med = await req.prisma.$queryRawUnsafe(`SELECT unit_price FROM "${req.schemaName}".medicines WHERE name ILIKE '%${s(item.name)}%' LIMIT 1`);
      const price = med[0]?.unit_price || 100; // Fallback price
      
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, quantity, unit_price)
        VALUES ('${patientId}', '${id}', 'PHARMACY', '${presId}', 'Medicine: ${s(item.name)}', 1, ${price})
      `);
    }
    res.json({ message: "Prescriptions saved and billed." });
  } catch (error) { next(error); }
});

router.post("/encounters/:id/lab-orders", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosticIds } = req.body;
    await ensureOrderColumns(req);
    await ensureBillingQueue(req);

    const encounter = await req.prisma.$queryRawUnsafe(`SELECT patient_id FROM "${req.schemaName}".encounters WHERE id = '${id}'`);
    const patientId = encounter[0]?.patient_id;

    for (const testId of diagnosticIds) {
      const orderId = crypto.randomUUID();
      const diag = await req.prisma.$queryRawUnsafe(`SELECT name, price FROM "${req.schemaName}".diagnostics WHERE id::text = '${testId}' OR name = '${testId}' LIMIT 1`);
      const testName = diag[0]?.name || testId;
      const price = diag[0]?.price || 500;

      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".lab_orders (id, encounter_id, test_name, status)
        VALUES ('${orderId}', '${id}', '${s(testName)}', 'Pending')
      `);

      // Push to Billing Queue
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, quantity, unit_price)
        VALUES ('${patientId}', '${id}', 'LAB', '${orderId}', 'Lab: ${s(testName)}', 1, ${price})
      `);
    }
    res.json({ message: "Lab orders saved and billed." });
  } catch (error) { next(error); }
});

router.get("/lab/orders", async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT lo.*, p.name as patient_name, p.mrn, p.id as patient_id, e.id as encounter_id, u.name as doctor_name
      FROM "${req.schemaName}".lab_orders lo
      JOIN "${req.schemaName}".encounters e ON lo.encounter_id = e.id
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
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

    // 2. Calculate Days and Room Charges
    const stayMs = new Date().getTime() - new Date(adm.admitted_at).getTime();
    const days = Math.max(1, Math.ceil(stayMs / (1000 * 60 * 60 * 24)));
    const roomCharge = days * (adm.daily_charge || adm.base_charge || 1000);

    // 3. Post Room Charges to Billing Queue
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".billing_queue (patient_id, source_module, source_id, description, quantity, unit_price)
      VALUES ('${adm.patient_id}', 'IPD_ROOM', '${id}', 'Room Charges (${days} Days in ${adm.ward_id})', 1, ${roomCharge})
    `);

    // 4. Create Discharge Summary
    await ensureDischargeTable(req);
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".discharge_summaries (admission_id, patient_id, summary_text, discharge_type, status)
      VALUES ('${id}', '${adm.patient_id}', '${s(summary)}', '${s(dischargeType)}', 'Final')
    `);

    // 5. Free the Bed & Update Admission Status
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".beds SET status = 'Vacant' WHERE id = '${adm.bed_id}'`);
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".ipd_admissions SET status = 'Discharged', discharged_at = NOW() WHERE id = '${id}'`);

    res.json({ success: true, message: "Patient discharged and bill finalized." });
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
    // For now, return a mock item if prescriptions table doesn't have a split items table yet
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".prescriptions WHERE id = '${id}'`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/dispense", async (req, res, next) => {
  try {
    const { prescriptionId, items, encounterId } = req.body;
    await ensureBillingQueue(req);

    for (const item of items) {
      // 1. Decrement Stock
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

module.exports = router;
