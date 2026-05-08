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
    const { patientId, doctorId, type, vitals, complaints } = req.body;
    const query = `
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, type, vitals, complaints, status)
      VALUES ('${patientId}', '${doctorId}', '${type}', ${jsonValue(vitals)}, '${s(complaints)}', 'Active')
      RETURNING *
    `;
    const result = await req.prisma.$queryRawUnsafe(query);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});

router.get("/encounters", async (req, res, next) => {
  try {
    await ensureEncounterTable(req);
    const status = req.query.status || 'Active';
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT e.*, p.name as patient_name, u.name as doctor_name 
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      WHERE e.status = '${status}'
      ORDER BY e.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// --- METRICS ---
router.get("/metrics/stats", async (req, res, next) => {
  try {
    const pCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".patients`);
    const eCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".encounters WHERE status = 'Active'`);
    const opCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".encounters WHERE type = 'OPD'`);
    const ipCount = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".encounters WHERE type = 'IPD'`);
    
    const lastPatient = await req.prisma.$queryRawUnsafe(`SELECT name FROM "${req.schemaName}".patients ORDER BY created_at DESC LIMIT 1`);

    res.json({
      metrics: {
        patientInflow: pCount[0].count,
        activeAdmissions: ipCount[0].count,
        pendingBills: 0,
        dailyRevenue: 0,
        lastPatient: lastPatient[0]?.name || 'No records'
      },
      ipOpRatio: {
        op_count: opCount[0].count,
        ip_count: ipCount[0].count
      },
      stockAlerts: [],
      bedStats: [{ status: 'Vacant', count: 10 }, { status: 'Occupied', count: 0 }],
      labStats: [{ status: 'Pending', count: 0 }, { status: 'Completed', count: 0 }],
      dischargeTrend: [
        { date: new Date().toISOString(), admitted: 0, discharged: 0 }
      ],
      weeklyFlow: []
    });
  } catch (error) { next(error); }
});

router.post("/encounters/:id/prescriptions", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    
    // Ensure table exists
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".prescriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id UUID REFERENCES "${req.schemaName}".encounters(id),
        medicine_name VARCHAR(255),
        dosage VARCHAR(50),
        frequency VARCHAR(50),
        duration VARCHAR(50),
        instructions TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const item of items) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".prescriptions (encounter_id, medicine_name, dosage, frequency, duration, instructions)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, id, item.name, item.dosage, item.frequency, item.duration, item.instructions);
    }
    res.json({ message: "Prescriptions saved" });
  } catch (error) { next(error); }
});

router.post("/encounters/:id/lab-orders", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosticIds } = req.body;
    
    // Ensure table exists
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".lab_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id UUID REFERENCES "${req.schemaName}".encounters(id),
        test_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const testName of diagnosticIds) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".lab_orders (encounter_id, test_name)
        VALUES ($1, $2)
      `, id, testName);
    }
    res.json({ message: "Lab orders saved" });
  } catch (error) { next(error); }
});

module.exports = router;
