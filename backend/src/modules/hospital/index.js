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
  // Ensure columns exist for existing tables
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".discharge_summaries ADD COLUMN IF NOT EXISTS authenticated_at TIMESTAMP`);
}

async function ensureOrderColumns(req) {
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS instructions TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS medicine_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".prescription_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS doctor_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Normal'`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS results JSONB`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS technician_notes TEXT`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".lab_orders ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT false`);
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

// --- Staff & Doctor Lists ---
router.get("/doctors", async (req, res, next) => {
  console.log(`[HOSPITAL] Fetching doctors for schema: ${req.schemaName}`);
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, specialization, department 
      FROM "${req.schemaName}".users 
      WHERE role ILIKE 'doctor' AND is_active = true
      ORDER BY name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

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
    const { search } = req.query;
    let query = `SELECT id, name, role, email, created_at, license_number, age, qualifications, experience_years, specialization, department 
                 FROM "${req.schemaName}".users`;
    
    if (search) {
      query += ` WHERE name ILIKE '%${search}%' OR role ILIKE '%${search}%' OR department ILIKE '%${search}%' OR email ILIKE '%${search}%'`;
    }
    
    query += ` ORDER BY created_at DESC`;
    const data = await req.prisma.$queryRawUnsafe(query);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/staff", checkPermission('STAFF_MANAGE'), async (req, res, next) => {
  try {
    const { name, email, password, role, license_number, age, qualifications, experience_years, specialization, department } = req.body;
    
    // Simple creation via raw SQL to match multi-tenant logic
    const userId = crypto.randomUUID();
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".users (id, name, email, password, role, license_number, age, qualifications, experience_years, specialization, department)
      VALUES ('${userId}', '${name}', '${email}', '${password}', '${role}', '${license_number || ''}', ${age || 0}, '${qualifications || ''}', ${experience_years || 0}, '${specialization || ''}', '${department || ''}')
    `);
    
    res.status(201).json({ message: "Staff member created", userId });
  } catch (error) { 
    if (error.message.includes("unique constraint") || error.message.includes("already exists")) {
      return res.status(400).json({ error: "A staff member with this email already exists." });
    }
    next(error); 
  }
});

router.put("/staff/:id", checkPermission('STAFF_MANAGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, license_number, age, qualifications, experience_years, specialization, department } = req.body;
    
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".users 
      SET name = '${name}', email = '${email}', role = '${role}', 
          license_number = '${license_number || ''}', age = ${age || 0}, 
          qualifications = '${qualifications || ''}', experience_years = ${experience_years || 0}, 
          specialization = '${specialization || ''}', department = '${department || ''}'
      WHERE id = '${id}'
    `);
    
    res.json({ message: "Staff updated successfully" });
  } catch (error) { next(error); }
});

router.delete("/staff/:id", checkPermission('STAFF_MANAGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".users WHERE id = '${id}'`);
    res.json({ message: "Staff deleted successfully" });
  } catch (error) { next(error); }
});

// --- Laboratory & Diagnostics ---
router.get("/lab/orders", checkPermission('LAB_MANAGE'), async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT lo.*, p.name as patient_name, p.id as patient_id, p.mrn, d.name as test_name, d.price, u.name as doctor_name
      FROM "${req.schemaName}".lab_orders lo
      JOIN "${req.schemaName}".patients p ON lo.patient_id = p.id
      LEFT JOIN "${req.schemaName}".users u ON lo.doctor_id = u.id
      LEFT JOIN "${req.schemaName}".diagnostics d ON lo.diagnostic_id = d.id
      WHERE lo.status != 'Published'
      ORDER BY lo.priority DESC, lo.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/lab/billing-queue", checkPermission('BILLING_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT lo.*, p.name as patient_name, p.id as patient_id, e.id as encounter_id, p.mrn, d.name as test_name, d.price
      FROM "${req.schemaName}".lab_orders lo
      JOIN "${req.schemaName}".encounters e ON lo.encounter_id = e.id
      JOIN "${req.schemaName}".patients p ON lo.patient_id = p.id
      JOIN "${req.schemaName}".diagnostics d ON lo.diagnostic_id = d.id
      WHERE lo.status = 'Authorized' AND (lo.is_billed = false OR lo.is_billed IS NULL)
    `);
    res.json(data);
  } catch (error) { next(error); }
});

const updateLabStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".lab_orders SET status = '${status}' WHERE id = '${id}'`);
    res.json({ message: `Status updated to ${status}` });
  } catch (error) { next(error); }
};

router.post("/lab/orders/:id/status", checkPermission('LAB_MANAGE'), updateLabStatus);
router.put("/lab/orders/:id/status", checkPermission('LAB_MANAGE'), updateLabStatus);

router.post("/lab/orders/:id/results", checkPermission('LAB_MANAGE'), async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    await ensureBillingQueue(req);
    const { id } = req.params;
    const { results, notes, technicianNote } = req.body;
    const escapedResults = JSON.stringify(results).replace(/'/g, "''");
    const escapedNotes = (notes || technicianNote) ? (notes || technicianNote).replace(/'/g, "''") : "";
    
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".lab_orders 
      SET results = '${escapedResults}'::jsonb, 
          technician_notes = '${escapedNotes}', 
          status = 'Authorized' 
      WHERE id = '${id}'
    `);

    // --- NEW: Push to Billing Queue (FIXED PRICE) ---
    const orderData = await req.prisma.$queryRawUnsafe(`
      SELECT lo.patient_id, lo.encounter_id, d.name as test_name, d.price 
      FROM "${req.schemaName}".lab_orders lo
      JOIN "${req.schemaName}".diagnostics d ON lo.diagnostic_id = d.id
      WHERE lo.id = '${id}'
    `);

    if (orderData && orderData.length > 0) {
      const { patient_id, encounter_id, test_name, price } = orderData[0];
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, unit_price, is_discountable)
        VALUES ('${patient_id}', '${encounter_id}', 'LAB', '${id}', 'Laboratory: ${test_name}', ${price}, FALSE)
      `);
    }

    res.json({ message: "Results saved and authorized. Pushed to Billing Queue." });
  } catch (error) { next(error); }
});

router.post("/lab/orders/:id/publish", checkPermission('LAB_MANAGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if paid
    const order = await req.prisma.$queryRawUnsafe(`SELECT is_billed FROM "${req.schemaName}".lab_orders WHERE id = '${id}'`);
    if (!order[0]?.is_billed) {
      return res.status(402).json({ error: "Payment required before publication." });
    }

    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".lab_orders SET status = 'Published' WHERE id = '${id}'`);
    res.json({ message: "Report published successfully" });
  } catch (error) { next(error); }
});

// --- Master Data ---
router.get("/masters/wards", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".wards ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/medicines", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, composition, category, unit_price as price
      FROM "${req.schemaName}".medicines
      WHERE COALESCE(is_active, true) = true
      ORDER BY name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/diseases", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT id, name, icd_code, category FROM "${req.schemaName}".diseases ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/diagnostics", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT id, name, price FROM "${req.schemaName}".diagnostics ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/services", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT id, name, price, type, category FROM "${req.schemaName}".services ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/treatments", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT id, name, price, category FROM "${req.schemaName}".treatments ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/departments", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT DISTINCT specialization as name, specialization as id
      FROM "${req.schemaName}".users
      WHERE specialization IS NOT NULL AND specialization != ''
      ORDER BY specialization ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/specialities", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT DISTINCT specialization as name, specialization as id
      FROM "${req.schemaName}".users
      WHERE specialization IS NOT NULL AND specialization != ''
      ORDER BY specialization ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/treatments", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, composition as description, category
      FROM "${req.schemaName}".medicines
      WHERE category IN ('Medication', 'Treatment')
      ORDER BY name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/masters/modes", async (req, res, next) => {
  try {
    // Self-healing fallback for consultation modes
    try {
      const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".consultation_modes ORDER BY name ASC`);
      res.json(data);
    } catch (e) {
      res.json([
        { id: 'm1', name: 'In-Person', price: 0 },
        { id: 'm2', name: 'Virtual/Teleconsult', price: 200 },
        { id: 'm3', name: 'Emergency/Home Visit', price: 500 }
      ]);
    }
  } catch (error) { next(error); }
});

router.get("/masters/services", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".medicines WHERE category = 'Laboratory' ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

// --- In-Patient Department (IPD) ---
router.get("/ipd/bedmap", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT w.*, COALESCE(COUNT(b.id), 0)::int as bed_count,
        COALESCE(SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END), 0)::int as occupied
      FROM "${req.schemaName}".wards w
      LEFT JOIN "${req.schemaName}".beds b ON b.ward_id = w.id
      GROUP BY w.id
      ORDER BY w.type, w.name
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/ipd/wards/:id/beds", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT b.id as bed_id, b.bed_number, b.status,
        ia.id as admission_id, p.name as patient_name, p.mrn
      FROM "${req.schemaName}".beds b
      LEFT JOIN "${req.schemaName}".ipd_admissions ia ON ia.bed_id = b.id AND ia.status = 'Admitted'
      LEFT JOIN "${req.schemaName}".patients p ON p.id = ia.patient_id
      WHERE b.ward_id = '${s(req.params.id)}'
      ORDER BY b.bed_number ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/ipd/wards/:id/provision-beds", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const wards = await req.prisma.$queryRawUnsafe(`SELECT id, name, capacity FROM "${req.schemaName}".wards WHERE id = '${s(req.params.id)}'`);
    if (!wards.length) return res.status(404).json({ error: "Ward not found" });

    const existing = await req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${req.schemaName}".beds WHERE ward_id = '${s(req.params.id)}'`);
    const start = Number(existing[0]?.count || 0);
    const capacity = Math.max(Number(wards[0].capacity || 0), 1);
    const prefix = String(wards[0].name || "WARD").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "BED";

    for (let i = start + 1; i <= capacity; i++) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".beds (ward_id, bed_number, status)
        VALUES ('${s(req.params.id)}', '${prefix}-${String(i).padStart(2, "0")}', 'Vacant')
      `);
    }

    res.status(201).json({ message: "Beds provisioned", created: Math.max(capacity - start, 0) });
  } catch (error) { next(error); }
});

router.get("/ipd/admissions", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT ia.*, p.name as patient_name, p.mrn, p.age, p.gender,
        b.bed_number, w.name as ward_name
      FROM "${req.schemaName}".ipd_admissions ia
      JOIN "${req.schemaName}".patients p ON ia.patient_id = p.id
      LEFT JOIN "${req.schemaName}".beds b ON ia.bed_id = b.id
      LEFT JOIN "${req.schemaName}".wards w ON b.ward_id = w.id
      WHERE ia.status = 'Admitted'
      ORDER BY ia.admitted_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/ipd/admissions", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const { patientId, bedId, wardId, admittingDoctorId, admissionReason, dailyCharge } = req.body;
    if (!patientId || !bedId || !wardId || !admittingDoctorId) {
      return res.status(400).json({ error: "Patient, ward, bed, and doctor are required." });
    }

    const occupied = await req.prisma.$queryRawUnsafe(`SELECT status FROM "${req.schemaName}".beds WHERE id = '${s(bedId)}'`);
    if (!occupied.length) return res.status(404).json({ error: "Selected bed was not found." });
    if (occupied[0].status === "Occupied") return res.status(409).json({ error: "Selected bed is already occupied." });

    const encounter = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, type, status, complaints)
      VALUES ('${s(patientId)}', '${s(admittingDoctorId)}', 'IPD', 'Admitted', '${s(admissionReason)}')
      RETURNING id
    `);

    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".ipd_admissions (
        patient_id, bed_id, ward_id, encounter_id, admitting_doctor_id, admission_reason, daily_charge, status
      )
      VALUES (
        '${s(patientId)}', '${s(bedId)}', '${s(wardId)}', '${encounter[0].id}', '${s(admittingDoctorId)}',
        '${s(admissionReason)}', ${Number(dailyCharge || 0)}, 'Admitted'
      )
      RETURNING id
    `);

    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".beds SET status = 'Occupied' WHERE id = '${s(bedId)}'`);
    res.status(201).json({ id: result[0].id, message: "Patient admitted successfully" });
  } catch (error) { next(error); }
});

router.get("/ipd/admissions/:id", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const admission = await req.prisma.$queryRawUnsafe(`
      SELECT ia.*, p.name as patient_name, p.mrn, p.age, p.gender, p.phone,
        b.bed_number, w.name as ward_name, u.name as doctor_name
      FROM "${req.schemaName}".ipd_admissions ia
      JOIN "${req.schemaName}".patients p ON ia.patient_id = p.id
      LEFT JOIN "${req.schemaName}".beds b ON ia.bed_id = b.id
      LEFT JOIN "${req.schemaName}".wards w ON ia.ward_id = w.id
      LEFT JOIN "${req.schemaName}".users u ON ia.admitting_doctor_id = u.id
      WHERE ia.id = '${s(req.params.id)}'
    `);
    if (!admission.length) return res.status(404).json({ error: "Admission not found" });

    const notes = await req.prisma.$queryRawUnsafe(`
      SELECT n.*, u.name as doctor_name
      FROM "${req.schemaName}".ipd_notes n
      LEFT JOIN "${req.schemaName}".users u ON n.doctor_id = u.id
      WHERE n.admission_id = '${s(req.params.id)}'
      ORDER BY n.created_at DESC
    `);

    const dischargeSummary = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".discharge_summaries 
      WHERE admission_id = '${s(req.params.id)}'
      ORDER BY created_at DESC LIMIT 1
    `);

    res.json({ admission: admission[0], notes, dischargeSummary: dischargeSummary[0] || null });
  } catch (error) { next(error); }
});

router.post("/ipd/admissions/:id/notes", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const doctorId = await getCurrentUserId(req);
    const { noteText, noteType } = req.body;
    if (!noteText) return res.status(400).json({ error: "Note text is required." });

    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".ipd_notes (admission_id, doctor_id, note_text, note_type)
      VALUES ('${s(req.params.id)}', ${sqlValue(doctorId)}, '${s(noteText)}', '${s(noteType || "Progress")}')
    `);
    res.status(201).json({ message: "Note saved" });
  } catch (error) { next(error); }
});

router.put("/ipd/admissions/:id/discharge", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    await ensureDischargeTable(req);

    const rows = await req.prisma.$queryRawUnsafe(`
      SELECT ia.*, p.name as patient_name
      FROM "${req.schemaName}".ipd_admissions ia
      JOIN "${req.schemaName}".patients p ON p.id = ia.patient_id
      WHERE ia.id = '${s(req.params.id)}'
    `);
    if (!rows.length) return res.status(404).json({ error: "Admission not found" });

    const adm = rows[0];
    const daysAdmitted = Math.max(Math.ceil((Date.now() - new Date(adm.admitted_at).getTime()) / 86400000), 1);
    const dailyCharge = Number(adm.daily_charge || 0);
    const bedCharges = daysAdmitted * dailyCharge;
    const doctorId = await getCurrentUserId(req);

    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".ipd_admissions
      SET status = 'Discharged', discharged_at = NOW()
      WHERE id = '${s(req.params.id)}'
    `);
    await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".beds SET status = 'Vacant' WHERE id = '${adm.bed_id}'`);
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".discharge_summaries (admission_id, patient_id, doctor_id, summary_text, discharge_type)
      VALUES ('${s(req.params.id)}', '${adm.patient_id}', ${sqlValue(doctorId)}, 'Discharge initiated. Final summary pending.', 'STANDARD')
    `);

    res.json({
      message: "Patient discharged",
      billingSummary: {
        daysAdmitted,
        dailyCharge,
        bedCharges,
        patientName: adm.patient_name,
        encounterId: adm.encounter_id
      }
    });
  } catch (error) { next(error); }
});

router.post("/ipd/admissions/:id/generate-summary", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    await ensureDischargeTable(req);

    const data = await req.prisma.$queryRawUnsafe(`
      SELECT ia.*, p.*, w.name as ward_name, b.bed_number
      FROM "${req.schemaName}".ipd_admissions ia
      JOIN "${req.schemaName}".patients p ON p.id = ia.patient_id
      LEFT JOIN "${req.schemaName}".wards w ON w.id = ia.ward_id
      LEFT JOIN "${req.schemaName}".beds b ON b.id = ia.bed_id
      WHERE ia.id = '${s(req.params.id)}'
    `);
    if (!data.length) return res.status(404).json({ error: "Admission not found" });

    const notes = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".ipd_notes WHERE admission_id = '${s(req.params.id)}' ORDER BY created_at ASC`);
    const summaryText = await aiService.generateDischargeSummary(data[0], data[0], notes, []);
    const pdf = await pdfService.createDischargeSummaryPDF(data[0], data[0], summaryText);
    const doctorId = await getCurrentUserId(req);

    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".discharge_summaries (admission_id, patient_id, doctor_id, summary_text, pdf_path, discharge_type)
      VALUES ('${s(req.params.id)}', '${data[0].patient_id}', ${sqlValue(doctorId)}, '${s(summaryText)}', '${s(pdf.filePath)}', 'AI_GENERATED')
    `);

    res.json({ message: "AI discharge summary generated", summaryText, pdfPath: pdf.filePath });
  } catch (error) { next(error); }
});

router.put("/ipd/discharges/:id", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { summary_text, is_authenticated } = req.body;
    
    let query = `UPDATE "${req.schemaName}".discharge_summaries SET summary_text = '${s(summary_text)}'`;
    
    if (is_authenticated) {
      query += `, is_authenticated = true, status = 'Authenticated', authenticated_at = NOW()`;
    }
    
    query += ` WHERE id = '${id}'`;
    
    await req.prisma.$executeRawUnsafe(query);
    res.json({ message: "Discharge summary updated successfully" });
  } catch (error) { next(error); }
});

router.get("/ipd/discharges", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    await ensureDischargeTable(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT ds.*, p.name as patient_name, p.mrn, u.name as doctor_name
      FROM "${req.schemaName}".discharge_summaries ds
      JOIN "${req.schemaName}".patients p ON p.id = ds.patient_id
      LEFT JOIN "${req.schemaName}".users u ON u.id = ds.doctor_id
      ORDER BY ds.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/ipd/discharge-summary", checkPermission('IPD_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT ds.*, p.name as patient_name, p.mrn, ia.admission_date
      FROM "${req.schemaName}".discharge_summaries ds
      JOIN "${req.schemaName}".patients p ON ds.patient_id = p.id
      JOIN "${req.schemaName}".ipd_admissions ia ON ds.admission_id = ia.id
      ORDER BY ds.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// --- Pharmacy Management ---
router.get("/pharmacy/inventory", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name, name as drug_name, category, composition, stock_quantity, unit_price, expiry_date
      FROM "${req.schemaName}".medicines
      WHERE COALESCE(is_active, true) = true
      ORDER BY name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/pharmacy/stats", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const stats = await req.prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as total_medicines,
        COUNT(CASE WHEN stock_quantity <= 10 THEN 1 END)::int as low_stock_items,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END)::int as expiring_items,
        SUM(stock_quantity)::int as total_stock
      FROM "${req.schemaName}".medicines
      WHERE COALESCE(is_active, true) = true
    `);
    
    const pendingPrescriptions = await req.prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as pending_count
      FROM "${req.schemaName}".prescriptions
      WHERE COALESCE(status, 'Pending') != 'Dispensed'
    `);
    
    res.json({
      inventory: stats[0],
      prescriptions: pendingPrescriptions[0]
    });
  } catch (error) { next(error); }
});

router.get("/pharmacy/prescriptions", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT pr.*, p.id as patient_id, p.name as patient_name, p.mrn, u.name as doctor_name
      FROM "${req.schemaName}".prescriptions pr
      JOIN "${req.schemaName}".encounters e ON pr.encounter_id = e.id
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      LEFT JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      WHERE COALESCE(pr.status, 'Pending') != 'Dispensed'
      ORDER BY pr.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/pharmacy/prescriptions/:id/items", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT pi.*, m.name as medicine_name, m.unit_price, m.stock_quantity
      FROM "${req.schemaName}".prescription_items pi
      LEFT JOIN "${req.schemaName}".medicines m ON pi.medicine_id = m.id
      WHERE pi.prescription_id = '${s(req.params.id)}'
      ORDER BY pi.created_at NULLS LAST
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/dispense", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    await ensureBillingQueue(req);
    const { encounterId, prescriptionId, items } = req.body;
    if (!encounterId) return res.status(400).json({ error: "Encounter is required for dispensing." });

    const encounter = await req.prisma.$queryRawUnsafe(`SELECT patient_id FROM "${req.schemaName}".encounters WHERE id = '${s(encounterId)}'`);
    if (!encounter.length) return res.status(404).json({ error: "Encounter not found." });

    for (const item of items || []) {
      if (!item.drugId || Number(item.quantity || 0) <= 0) continue;
      const stock = await req.prisma.$queryRawUnsafe(`SELECT name, stock_quantity, unit_price FROM "${req.schemaName}".medicines WHERE id = '${s(item.drugId)}'`);
      if (!stock.length) continue;
      if (Number(stock[0].stock_quantity || 0) < Number(item.quantity)) {
        return res.status(409).json({ error: `Insufficient stock for ${stock[0].name}` });
      }

      await req.prisma.$executeRawUnsafe(`
        UPDATE "${req.schemaName}".medicines
        SET stock_quantity = stock_quantity - ${Number(item.quantity)}
        WHERE id = '${s(item.drugId)}'
      `);

      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, quantity, unit_price, is_discountable)
        VALUES ('${encounter[0].patient_id}', '${s(encounterId)}', 'PHARMACY', '${s(item.drugId)}', 'Pharmacy: ${s(item.drugName || stock[0].name)}', ${Number(item.quantity)}, ${Number(item.unitPrice || stock[0].unit_price || 0)}, FALSE)
      `);
    }

    if (prescriptionId) {
      await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".prescriptions SET status = 'Dispensed' WHERE id = '${s(prescriptionId)}'`);
    } else {
      await req.prisma.$executeRawUnsafe(`UPDATE "${req.schemaName}".prescriptions SET status = 'Dispensed' WHERE encounter_id = '${s(encounterId)}'`);
    }

    res.json({ message: "Medication dispensed and queued for billing." });
  } catch (error) { next(error); }
});

// --- Clinical Encounters (OPD/IPD Queue) ---
router.get("/encounters", async (req, res, next) => {
  try {
    const { status, type } = req.query;
    let query = `
      SELECT e.*, p.name as patient_name, p.mrn, p.phone, p.age, p.gender, u.name as doctor_name
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      WHERE 1=1
    `;
    
    if (status) query += ` AND e.status = '${status}'`;
    if (type) query += ` AND e.type = '${type}'`;
    
    query += ` ORDER BY e.created_at DESC`;
    
    const data = await req.prisma.$queryRawUnsafe(query);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/encounters", async (req, res, next) => {
  try {
    const { patientId, doctorId, type, vitals, complaints } = req.body;
    if (!patientId || !doctorId) return res.status(400).json({ error: "Patient and doctor are required." });

    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, type, status, vitals, complaints)
      VALUES ('${s(patientId)}', '${s(doctorId)}', '${s(type || "OPD")}', 'Draft', ${jsonValue(vitals)}, '${s(complaints)}')
      RETURNING id
    `);
    res.status(201).json({ id: result[0].id, message: "Encounter created" });
  } catch (error) { next(error); }
});

router.put("/encounters/:id", async (req, res, next) => {
  try {
    const { diagnosis, status, notes } = req.body;
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".encounters
      SET diagnosis = '${s(diagnosis)}', status = '${s(status || "Completed")}', notes = '${s(notes)}'
      WHERE id = '${s(req.params.id)}'
    `);
    res.json({ message: "Encounter updated" });
  } catch (error) { next(error); }
});

router.post("/encounters/:id/prescriptions", async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const { items } = req.body;
    const prescription = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".prescriptions (encounter_id, status)
      VALUES ('${s(req.params.id)}', 'Pending')
      RETURNING id
    `);

    for (const item of items || []) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".prescription_items (prescription_id, medicine_id, drug_name, dosage, frequency, duration, instructions)
        VALUES ('${prescription[0].id}', ${sqlValue(item.medicine_id)}, '${s(item.name)}', '${s(item.dosage)}', '${s(item.frequency)}', '${s(item.duration)}', '${s(item.instructions)}')
      `);
    }

    res.status(201).json({ message: "Prescription saved", id: prescription[0].id });
  } catch (error) { next(error); }
});

router.post("/encounters/:id/lab-orders", async (req, res, next) => {
  try {
    await ensureOrderColumns(req);
    const encounterRows = await req.prisma.$queryRawUnsafe(`SELECT patient_id, doctor_id FROM "${req.schemaName}".encounters WHERE id = '${s(req.params.id)}'`);
    if (!encounterRows.length) return res.status(404).json({ error: "Encounter not found" });

    for (const diagnosticId of req.body.diagnosticIds || []) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".lab_orders (patient_id, encounter_id, doctor_id, diagnostic_id, status, priority)
        VALUES ('${encounterRows[0].patient_id}', '${s(req.params.id)}', '${encounterRows[0].doctor_id}', '${s(diagnosticId)}', 'Pending', 'Normal')
      `);
    }

    res.status(201).json({ message: "Lab orders created" });
  } catch (error) { next(error); }
});

// --- Analytics & Reporting ---
router.use("/metrics", metricsRoutes);

// Catch-all for debugging 404s within this module
router.use((req, res) => {
  console.warn(`[HOSPITAL 404] Route not found within hospital module: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found in hospital module", path: req.originalUrl });
});

module.exports = router;
