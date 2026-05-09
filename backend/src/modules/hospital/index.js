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
}

async function ensureStaffColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS dob DATE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS doj DATE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100)`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);

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

async function ensureBillingQueue(req) {
  await req.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${req.schemaName}".billing_queue (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL, encounter_id UUID, source_module VARCHAR(50), source_id UUID, description TEXT, quantity NUMERIC DEFAULT 1, unit_price NUMERIC NOT NULL, tax_percent NUMERIC DEFAULT 0, is_discountable BOOLEAN DEFAULT TRUE, status VARCHAR(20) DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT NOW())`);
}

// --- GLOBAL HEAL UTILITY ---
router.get("/heal-all-masters", async (req, res, next) => {
  try {
    await ensureStaffColumns(req);
    await ensurePatientColumns(req);
    await ensureIPDMasters(req);
    await ensureEncounterTable(req);
    await ensureOrderColumns(req);
    await ensureDischargeTable(req);
    await ensureBillingQueue(req);
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
      const fields = Object.keys(req.body).filter(f => ['name','description','category','price','hod','specialty','status'].includes(f));
      const values = fields.map(f => typeof req.body[f] === 'string' ? `'${req.body[f].replace(/'/g, "''")}'` : req.body[f]);
      const query = `INSERT INTO "${req.schemaName}"."${table}" (${fields.join(',')}) VALUES (${values.join(',')}) RETURNING *`;
      const result = await req.prisma.$queryRawUnsafe(query);
      res.status(201).json(result[0]);
    } catch (error) { next(error); }
  });
});

router.get("/staff", checkPermission('STAFF_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".users ORDER BY created_at DESC`);
    res.json(data);
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
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT e.*, p.name as patient_name, p.mrn, u.name as doctor_name 
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      WHERE e.status = '${status}'
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
      SELECT a.*, p.name as patient_name, p.mrn, w.name as ward_name, b.bed_number, u.name as doctor_name
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
      JOIN "${req.schemaName}".beds b ON a.bed_id = b.id
      JOIN "${req.schemaName}".users u ON a.admitting_doctor_id = u.id
      WHERE a.status = 'Admitted'
      ORDER BY a.admitted_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// --- CLINICAL ORDERS (LAB & PHARMACY) ---
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
      SELECT lo.*, p.name as patient_name, p.mrn, u.name as doctor_name
      FROM "${req.schemaName}".lab_orders lo
      JOIN "${req.schemaName}".encounters e ON lo.encounter_id = e.id
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      ORDER BY lo.created_at DESC
    `);
    res.json(data);
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

module.exports = router;
