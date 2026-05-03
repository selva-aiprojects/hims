const express = require("express");
const router = express.Router();
const { checkPermission } = require("../../middleware/rbac");
const aiService = require("../../services/aiService");
const pdfService = require("../../services/pdfService");
const upload = require("../../config/upload");

// --- Staff & Management ---

router.get("/staff", checkPermission('STAFF_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT id, name, role, email, created_at FROM "${req.schemaName}".users ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/staff", checkPermission('STAFF_MANAGE'), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password || "HIMS@123", 10);
    const schema = req.schemaName;
    
    // 1. Insert user
    const newUser = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${schema}".users (name, email, password_hash, role)
      VALUES ('${name.replace(/'/g, "''")}', '${email}', '${hashedPassword}', '${role || 'staff'}')
      RETURNING id
    `);
    const userId = newUser[0].id;

    // 2. Map users.role → rbac_roles.name (normalize to uppercase RBAC role)
    const roleMap = {
      'admin':         'ADMIN',
      'doctor':        'DOCTOR',
      'nurse':         'NURSE',
      'pharmacist':    'PHARMACIST',
      'lab_assistant': 'LAB_TECH',
      'lab_tech':      'LAB_TECH',
      'receptionist':  'RECEPTIONIST',
      'staff':         'SUPPORT',
      'support':       'SUPPORT',
    };
    const rbacRoleName = roleMap[(role || 'staff').toLowerCase()] || 'SUPPORT';

    // 3. Link user to RBAC role
    try {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".rbac_user_roles (user_id, role_id)
        SELECT '${userId}', id FROM "${schema}".rbac_roles WHERE name = '${rbacRoleName}'
        ON CONFLICT DO NOTHING
      `);
      console.log(`[STAFF] Linked ${email} (${role}) → RBAC:${rbacRoleName}`);
    } catch (rbacErr) {
      console.warn(`[STAFF] RBAC link failed for ${email}: ${rbacErr.message}`);
    }

    res.status(201).json({ message: "Staff member created", userId });
  } catch (error) { 
    if (error.message.includes("unique constraint") || error.message.includes("already exists")) {
      return res.status(400).json({ error: "A staff member with this email already exists." });
    }
    next(error); 
  }
});

// --- Master Data Management ---

// 1. Departments
router.get("/masters/departments", checkPermission('MASTERS_MANAGE'), async (req, res, next) => {
  try {
    console.log(`[MASTERS] Fetching departments for schema: "${req.schemaName}"`);
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".departments ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/departments", async (req, res, next) => {
  try {
    const { name, description, hod, specialty, status } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".departments (name, description, hod, specialty, status) 
      VALUES ('${name}', '${description}', '${hod || ''}', '${specialty || ''}', '${status || 'Active'}')
    `);
    res.status(201).json({ message: "Department added" });
  } catch (error) { next(error); }
});

// 2. Medicines
router.get("/masters/medicines", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".medicines ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/medicines", async (req, res, next) => {
  try {
    const { name, category, composition, dosage_adult, dosage_pediatric, instructions } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".medicines (name, category, composition, dosage_adult, dosage_pediatric, instructions) 
      VALUES ('${name}', '${category || 'General'}', '${composition || ''}', '${dosage_adult || ''}', '${dosage_pediatric || ''}', '${instructions || ''}')
      ON CONFLICT (name) DO UPDATE SET 
        category = EXCLUDED.category,
        composition = EXCLUDED.composition,
        dosage_adult = EXCLUDED.dosage_adult,
        dosage_pediatric = EXCLUDED.dosage_pediatric,
        instructions = EXCLUDED.instructions
    `);
    res.status(201).json({ message: "Medicine added/updated" });
  } catch (error) { next(error); }
});

// 3. Diseases
router.get("/masters/diseases", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".diseases ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/diseases", async (req, res, next) => {
  try {
    const { name, category, icd_code, severity_level } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".diseases (name, category, icd_code, severity_level) 
      VALUES ('${name}', '${category}', '${icd_code || ''}', '${severity_level || 'Moderate'}')
    `);
    res.status(201).json({ message: "Disease added" });
  } catch (error) { next(error); }
});

// 4. Treatments
router.get("/masters/treatments", async (req, res, next) => {
  try {
    console.log(`[MASTERS] Fetching treatments for schema: "${req.schemaName}"`);
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".treatments ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/treatments", async (req, res, next) => {
  try {
    const { name, price, description, cpt_code, estimated_duration } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".treatments (name, price, description, cpt_code, estimated_duration) 
      VALUES ('${name}', ${price || 0}, '${description || ''}', '${cpt_code || ''}', ${estimated_duration || 30})
    `);
    res.status(201).json({ message: "Treatment added" });
  } catch (error) { next(error); }
});

// 5. Services
router.get("/masters/services", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".services ORDER BY category, name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/services", async (req, res, next) => {
  try {
    const { name, price, category, service_code, tax_percent } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".services (name, price, category, service_code, tax_percent) 
      VALUES ('${name}', ${price || 0}, '${category || 'General'}', '${service_code || ''}', ${tax_percent || 0})
    `);
    res.status(201).json({ message: "Service added" });
  } catch (error) { next(error); }
});

// 6. Specialities
router.get("/masters/specialities", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".specialities ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/specialities", async (req, res, next) => {
  try {
    const { name, fee, description } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".specialities (name, base_consultation_fee, description) 
      VALUES ('${name}', ${fee || 0}, '${description || ''}')
    `);
    res.status(201).json({ message: "Speciality added" });
  } catch (error) { next(error); }
});

// 7. Consultation Modes
router.get("/masters/modes", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".consultation_modes ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/modes", async (req, res, next) => {
  try {
    const { name, surcharge, is_virtual } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".consultation_modes (name, surcharge_percent, is_virtual) 
      VALUES ('${name}', ${surcharge || 0}, ${is_virtual ? 'TRUE' : 'FALSE'})
    `);
    res.status(201).json({ message: "Mode added" });
  } catch (error) { next(error); }
});

// --- Clinical & Queue ---

// 1. Get Queue
router.get("/encounters", async (req, res, next) => {
  try {
    const status = req.query.status || 'Draft';
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT e.*, p.name as patient_name, p.mrn, p.age, p.gender, u.name as doctor_name
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      WHERE e.status = '${status}'
      ORDER BY e.created_at ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// 2. Create Encounter (Intake)
router.post("/encounters", async (req, res, next) => {
  try {
    const { patientId, doctorId, type, vitals, complaints } = req.body;
    
    // Generate a simple daily token (count of today's encounters + 1)
    const today = new Date().toISOString().split('T')[0];
    const countRes = await req.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "${req.schemaName}".encounters 
      WHERE created_at >= '${today}'
    `);
    const token = Number(countRes[0].count) + 1;

    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, type, vitals, complaints, status)
      VALUES ('${patientId}', '${doctorId}', '${type || 'OPD'}', '${JSON.stringify(vitals || {})}', '${complaints || ''}', 'Draft')
      RETURNING *
    `);
    
    const encounter = result[0];
    encounter.token = token; // Attach for the response
    
    res.status(201).json(encounter);
  } catch (error) { next(error); }
});

// 3. Update Encounter (Consultation Finalization)
router.put("/encounters/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosis, notes, status, vitals } = req.body;
    
    let updateSet = [];
    if (diagnosis) updateSet.push(`diagnosis = '${diagnosis.replace(/'/g, "''")}'`);
    if (notes) updateSet.push(`notes = '${notes.replace(/'/g, "''")}'`);
    if (status) updateSet.push(`status = '${status}'`);
    if (vitals) updateSet.push(`vitals = '${JSON.stringify(vitals)}'`);

    if (updateSet.length === 0) return res.json({ message: "Nothing to update" });

    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".encounters 
      SET ${updateSet.join(', ')}
      WHERE id = '${id}'
    `);
    res.json({ message: "Consultation finalized" });
  } catch (error) { next(error); }
});

// 4. Save Prescription
router.post("/encounters/:id/prescriptions", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { drug_name, dosage, frequency, duration }

    // 1. Create Prescription Header
    const presHeader = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".prescriptions (encounter_id)
      VALUES ('${id}')
      RETURNING id
    `);
    const presId = presHeader[0].id;

    // 2. Insert Items
    for (const item of items) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".prescription_items (prescription_id, drug_name, dosage, frequency, duration)
        VALUES ('${presId}', '${item.name}', '${item.dosage}', '${item.frequency || '1-0-1'}', '${item.duration || '5 days'}')
      `);
    }

    res.status(201).json({ message: "Prescription saved", id: presId });
  } catch (error) { next(error); }
});

// 2. Save Lab Orders
router.post("/encounters/:id/lab-orders", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosticIds } = req.body; // Array of diagnostic IDs

    for (const diagId of diagnosticIds) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".lab_orders (encounter_id, diagnostic_id, status)
        VALUES ('${id}', '${diagId}', 'Pending')
      `);
    }

    res.status(201).json({ message: "Lab orders submitted successfully" });
  } catch (error) { next(error); }
});

// --- Laboratory ---
// Lab routes: lab_assistant can view queue & enter results; doctor can order

// Upload and Parse External Lab Report via AI
router.post("/lab/upload-external", upload.single('lab_report'), checkPermission('LAB_MANAGE'), async (req, res, next) => {
  try {
    const { patientId } = req.body;
    if (!req.file || !patientId) return res.status(400).json({ error: "Missing file or patientId" });

    // Parse the file via AI
    const parsedData = await aiService.parseExternalLabReport(req.file.path);
    if (parsedData.error) return res.status(500).json({ error: parsedData.error });

    // Format the note text
    const noteText = `External Lab Report Analyzed:\nLab: ${parsedData.lab_name || 'Unknown'}\nDate: ${parsedData.test_date || 'Unknown'}\n\nFindings:\n${parsedData.results?.map((r) => `- ${r.test_name}: ${r.value} ${r.unit} (Ref: ${r.reference_range}) ${r.is_abnormal ? '[ABNORMAL]' : ''}`).join('\n')}\n\nClinical Interpretation: ${parsedData.clinical_interpretation}`;
    const safeNoteText = noteText.replace(/'/g, "''");

    // Fetch patient to update their summary
    const patients = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".patients WHERE id = '${patientId}'`);
    if (patients[0]) {
      const p = patients[0];
      const newSummary = (p.ai_summary ? p.ai_summary + '\n\n' : '') + `[NEW EXTERNAL LAB]: ${parsedData.clinical_interpretation}`;
      const safeSummary = newSummary.replace(/'/g, "''");
      
      await req.prisma.$executeRawUnsafe(`
        UPDATE "${req.schemaName}".patients 
        SET ai_summary = '${safeSummary}'
        WHERE id = '${patientId}'
      `);
    }

    // Attempt to find active encounter to attach note, otherwise just return the data
    const activeEncounter = await req.prisma.$queryRawUnsafe(`
      SELECT id FROM "${req.schemaName}".encounters 
      WHERE patient_id = '${patientId}' AND status IN ('Draft', 'Consulting') 
      ORDER BY created_at DESC LIMIT 1
    `);

    if (activeEncounter[0]) {
      // Create a dummy IPD note or attach to encounter notes depending on how we handle outpatient notes.
      // Since we don't have an encounter_notes table, we can just return it to the frontend to handle.
    }

    res.json({ message: "External report processed successfully", data: parsedData, noteText });
  } catch (error) { next(error); }
});

router.get("/lab/orders", checkPermission('LAB_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT lo.*, p.name as patient_name, p.mrn, d.name as test_name, d.price
      FROM "${req.schemaName}".lab_orders lo
      JOIN "${req.schemaName}".encounters e ON lo.encounter_id = e.id
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".diagnostics d ON lo.diagnostic_id = d.id
      WHERE lo.status = 'Pending'
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.put("/lab/orders/:id", checkPermission('LAB_MANAGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { result_data } = req.body;
    
    // 1. Save Result
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".lab_results (lab_order_id, result)
      VALUES ('${id}', '${JSON.stringify({ observation: result_data })}')
    `);
    
    // 2. Update Status
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".lab_orders SET status = 'Completed' WHERE id = '${id}'
    `);
    
    res.json({ message: "Lab result recorded" });
  } catch (error) { next(error); }
});

// --- Pharmacy ---
router.get("/pharmacy/stats", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const dailyRevenue = await req.prisma.$queryRawUnsafe(`
      SELECT SUM(total) as sum FROM "${req.schemaName}".invoices 
      WHERE bill_type = 'PHARMACY' AND status = 'PAID' AND created_at > NOW() - INTERVAL '24 hours'
    `);

    const recentDispenses = await req.prisma.$queryRawUnsafe(`
      SELECT i.total, p.name as patient_name, i.created_at
      FROM "${req.schemaName}".invoices i
      JOIN "${req.schemaName}".patients p ON i.patient_id = p.id
      WHERE i.bill_type = 'PHARMACY'
      ORDER BY i.created_at DESC
      LIMIT 5
    `);

    res.json({
      todaysSales: Number(dailyRevenue[0]?.sum || 0),
      recentDispenses: recentDispenses
    });
  } catch (error) { next(error); }
});

// Pharmacy routes: pharmacist manages stock & dispensing; doctor can view inventory for reference

router.get("/pharmacy/inventory", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name as drug_name, category, stock_quantity, unit_price, expiry_date 
      FROM "${req.schemaName}".medicines 
      ORDER BY name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/inventory", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const { name, category, quantity, price, expiryDate } = req.body;
    
    // Fallback safe string
    const safeName = (name || "").replace(/'/g, "''");
    
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".medicines (name, category, stock_quantity, unit_price, expiry_date)
      VALUES ('${safeName}', '${category}', ${parseInt(quantity) || 0}, ${parseFloat(price) || 0}, '${expiryDate}')
    `);
    
    res.status(201).json({ message: "Stock item added successfully" });
  } catch (error) { next(error); }
});

router.get("/pharmacy/prescriptions", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT pr.*, p.name as patient_name, p.mrn, e.id as encounter_id
      FROM "${req.schemaName}".prescriptions pr
      JOIN "${req.schemaName}".encounters e ON pr.encounter_id = e.id
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      WHERE pr.id IN (SELECT prescription_id FROM "${req.schemaName}".prescription_items)
      ORDER BY pr.id DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.get("/pharmacy/prescriptions/:id/items", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".prescription_items WHERE prescription_id = '${id}'
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/dispense", checkPermission('PHARMACY_MANAGE'), async (req, res, next) => {
  try {
    const { encounterId, items } = req.body; // items: [{ drugId, quantity, unitPrice }]

    // 1. Get Patient ID from Encounter
    const encounterData = await req.prisma.$queryRawUnsafe(`
      SELECT patient_id FROM "${req.schemaName}".encounters WHERE id = '${encounterId}'
    `);
    const patientId = encounterData[0]?.patient_id;

    // 2. Create Dispense Record
    const dispense = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".pharmacy_dispenses (encounter_id, patient_id)
      VALUES ('${encounterId}', '${patientId}')
      RETURNING id
    `);
    const dispenseId = dispense[0].id;

      // 3. Process Items with Schema-Agnostic Fallback
      for (const item of items) {
        try {
          await req.prisma.$executeRawUnsafe(`
            INSERT INTO "${req.schemaName}".pharmacy_dispense_items (dispense_id, medicine_id, quantity)
            VALUES ('${dispenseId}', '${item.drugId}', ${item.quantity})
          `);
        } catch (e) {
          // Fallback for legacy shards using brand_id column
          await req.prisma.$executeRawUnsafe(`
            INSERT INTO "${req.schemaName}".pharmacy_dispense_items (dispense_id, brand_id, quantity)
            VALUES ('${dispenseId}', '${item.drugId}', ${item.quantity})
          `);
        }

      // Update Inventory
      await req.prisma.$executeRawUnsafe(`
        UPDATE "${req.schemaName}".medicines 
        SET stock_quantity = stock_quantity - ${item.quantity}
        WHERE id = '${item.drugId}'
      `);
    }

    res.status(201).json({ message: "Medication dispensed successfully" });
  } catch (error) { next(error); }
});

// --- IPD / Wards & Beds ---

router.get("/masters/wards", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".wards ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

// Live Bed Map: all wards with real-time bed occupancy counts
router.get("/ipd/bedmap", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT 
        w.id, w.name, w.capacity, w.type, w.floor,
        COUNT(a.id) FILTER (WHERE a.status = 'Active') AS occupied,
        w.capacity - COUNT(a.id) FILTER (WHERE a.status = 'Active') AS available
      FROM "${req.schemaName}".wards w
      LEFT JOIN "${req.schemaName}".ipd_admissions a ON a.ward_id = w.id
      GROUP BY w.id, w.name, w.capacity, w.type, w.floor
      ORDER BY w.name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// Beds in a specific ward with patient details if occupied
router.get("/ipd/wards/:wardId/beds", async (req, res, next) => {
  try {
    const { wardId } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT 
        b.id as bed_id, b.bed_number, b.status,
        a.id as admission_id, a.admitted_at, a.admission_reason, a.daily_charge,
        p.name as patient_name, p.mrn, p.age, p.gender
      FROM "${req.schemaName}".beds b
      LEFT JOIN "${req.schemaName}".ipd_admissions a ON a.bed_id = b.id AND a.status = 'Active'
      LEFT JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      WHERE b.ward_id = '${wardId}'
      ORDER BY b.bed_number ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// All active admissions (census view)
router.get("/ipd/admissions", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT 
        a.*, p.name as patient_name, p.mrn, p.age, p.gender,
        w.name as ward_name, b.bed_number,
        u.name as doctor_name
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
      JOIN "${req.schemaName}".beds b ON a.bed_id = b.id
      LEFT JOIN "${req.schemaName}".users u ON a.admitting_doctor_id = u.id
      WHERE a.status = 'Active'
      ORDER BY a.admitted_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// Admit a patient (creates encounter + bed assignment)
router.post("/ipd/admissions", async (req, res, next) => {
  try {
    const { patientId, wardId, bedId, admittingDoctorId, admissionReason, dailyCharge } = req.body;

    // 1. Create IPD Encounter
    const enc = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, type, status, complaints)
      VALUES ('${patientId}', '${admittingDoctorId}', 'IPD', 'Active', '${admissionReason}')
      RETURNING id
    `);
    const encounterId = enc[0].id;

    // 2. Create Admission Record
    const adm = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".ipd_admissions (patient_id, bed_id, ward_id, encounter_id, admitting_doctor_id, admission_reason, daily_charge)
      VALUES ('${patientId}', '${bedId}', '${wardId}', '${encounterId}', '${admittingDoctorId}', '${admissionReason}', ${dailyCharge || 0})
      RETURNING id
    `);

    // 3. Mark bed as Occupied
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".beds SET status = 'Occupied' WHERE id = '${bedId}'
    `);

    res.status(201).json({ message: "Patient admitted successfully", admissionId: adm[0].id, encounterId });
  } catch (error) { next(error); }
});

// Get single admission detail with notes
router.get("/ipd/admissions/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const [admissionRes, notesRes] = await Promise.all([
      req.prisma.$queryRawUnsafe(`
        SELECT a.*, p.name as patient_name, p.mrn, p.age, p.gender, p.phone,
          w.name as ward_name, b.bed_number, u.name as doctor_name
        FROM "${req.schemaName}".ipd_admissions a
        JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
        JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
        JOIN "${req.schemaName}".beds b ON a.bed_id = b.id
        LEFT JOIN "${req.schemaName}".users u ON a.admitting_doctor_id = u.id
        WHERE a.id = '${id}'
      `),
      req.prisma.$queryRawUnsafe(`
        SELECT n.*, u.name as doctor_name FROM "${req.schemaName}".ipd_notes n
        LEFT JOIN "${req.schemaName}".users u ON n.doctor_id = u.id
        WHERE n.admission_id = '${id}' ORDER BY n.created_at DESC
      `)
    ]);
    res.json({ admission: admissionRes[0], notes: notesRes });
  } catch (error) { next(error); }
});

// Add clinical note to admission
router.post("/ipd/admissions/:id/notes", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { noteText, noteType, doctorId } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".ipd_notes (admission_id, doctor_id, note_text, note_type)
      VALUES ('${id}', '${doctorId || req.user?.id}', '${noteText}', '${noteType || 'Progress'}')
    `);
    res.status(201).json({ message: "Note added" });
  } catch (error) { next(error); }
});

// Generate AI Discharge Summary and PDF
router.post("/ipd/admissions/:id/generate-summary", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get admission details
    const adm = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name, p.age, p.gender, p.mrn, p.phone, w.name as ward_name
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      JOIN "${req.schemaName}".wards w ON a.ward_id = w.id
      WHERE a.id = '${id}'
    `);
    if (!adm[0]) return res.status(404).json({ error: "Admission not found" });

    // Get clinical notes
    const notes = await req.prisma.$queryRawUnsafe(`
      SELECT note_type, note_text, created_at
      FROM "${req.schemaName}".ipd_notes
      WHERE admission_id = '${id}'
      ORDER BY created_at ASC
    `);

    // Get lab results (if any exist for the encounter)
    let labs = [];
    if (adm[0].encounter_id) {
       labs = await req.prisma.$queryRawUnsafe(`
        SELECT d.name, lo.status, lo.created_at
        FROM "${req.schemaName}".lab_orders lo
        JOIN "${req.schemaName}".diagnostics d ON lo.diagnostic_id = d.id
        WHERE lo.encounter_id = '${adm[0].encounter_id}'
      `);
    }

    // Generate Summary via AI
    const summaryText = await aiService.generateDischargeSummary(adm[0], adm[0], notes, labs);

    // Save as IPD Note
    const safeSummaryText = summaryText.replace(/'/g, "''");
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".ipd_notes (admission_id, doctor_id, note_text, note_type) 
      VALUES ('${id}', '${req.user.id}', '${safeSummaryText}', 'Discharge Summary')
    `);

    // Generate PDF
    const pdfResult = await pdfService.createDischargeSummaryPDF(adm[0], adm[0], summaryText);

    res.json({
      message: "Discharge Summary Generated",
      summary: summaryText,
      pdfPath: pdfResult.filePath
    });
  } catch (error) { next(error); }
});

// Discharge patient
router.put("/ipd/admissions/:id/discharge", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 1. Get admission details for billing calculation
    const adm = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, p.id as patient_id
      FROM "${req.schemaName}".ipd_admissions a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      WHERE a.id = '${id}'
    `);
    if (!adm[0]) return res.status(404).json({ error: "Admission not found" });

    const admission = adm[0];
    const daysAdmitted = Math.ceil((Date.now() - new Date(admission.admitted_at).getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const bedCharges = daysAdmitted * Number(admission.daily_charge);

    // 2. Update admission status
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".ipd_admissions 
      SET status = 'Discharged', discharged_at = NOW() 
      WHERE id = '${id}'
    `);

    // 3. Free the bed
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".beds SET status = 'Vacant' WHERE id = '${admission.bed_id}'
    `);

    // 4. Update encounter status
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".encounters SET status = 'Discharged' WHERE id = '${admission.encounter_id}'
    `);

    res.json({ 
      message: "Patient discharged successfully",
      billingSummary: {
        patientName: admission.patient_name,
        patientId: admission.patient_id,
        encounterId: admission.encounter_id,
        daysAdmitted,
        bedCharges,
        dailyCharge: Number(admission.daily_charge)
      }
    });
  } catch (error) { next(error); }
});

// Provision beds for a ward (auto-create beds up to capacity)
router.post("/ipd/wards/:wardId/provision-beds", async (req, res, next) => {
  try {
    const { wardId } = req.params;
    const ward = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".wards WHERE id = '${wardId}'`);
    if (!ward[0]) return res.status(404).json({ error: "Ward not found" });
    
    const capacity = ward[0].capacity;
    for (let i = 1; i <= capacity; i++) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".beds (ward_id, bed_number, status)
        VALUES ('${wardId}', 'BED-${String(i).padStart(2, '0')}', 'Vacant')
        ON CONFLICT DO NOTHING
      `);
    }
    res.json({ message: `${capacity} beds provisioned for ward` });
  } catch (error) { next(error); }
});

router.get("/rbac/sync", async (req, res, next) => {
  try {
    const schema = req.schemaName;
    console.log(`[RBAC_SYNC] Full RBAC sync triggered for ${schema}`);

    // 1. Ensure RBAC tables exist
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
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_role_menus (
          role_id UUID REFERENCES "${schema}".rbac_roles(id) ON DELETE CASCADE,
          menu_id UUID REFERENCES "${schema}".rbac_menus(id) ON DELETE CASCADE,
          PRIMARY KEY (role_id, menu_id)
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(100) UNIQUE NOT NULL,
          description TEXT
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_role_permissions (
          role_id UUID REFERENCES "${schema}".rbac_roles(id) ON DELETE CASCADE,
          permission_id UUID REFERENCES "${schema}".rbac_permissions(id) ON DELETE CASCADE,
          PRIMARY KEY (role_id, permission_id)
      );
      CREATE TABLE IF NOT EXISTS "${schema}".rbac_user_roles (
          user_id UUID REFERENCES "${schema}".users(id) ON DELETE CASCADE,
          role_id UUID REFERENCES "${schema}".rbac_roles(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, role_id)
      );
    `);

    // 2. Seed all roles (incl. RECEPTIONIST)
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_roles (name, description) VALUES
      ('ADMIN',        'Full system access'),
      ('DOCTOR',       'Clinical access - OPD, consultation, lab orders'),
      ('NURSE',        'Nursing access - vitals, in-patient care'),
      ('PHARMACIST',   'Pharmacy access - inventory, dispensing'),
      ('LAB_TECH',     'Lab access - test queue and result entry'),
      ('RECEPTIONIST', 'Front desk - patient registration and appointments'),
      ('SUPPORT',      'General staff - read-only access')
      ON CONFLICT (name) DO NOTHING
    `);

    // 3. Seed all menus (complete set across all tiers)
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_menus (label, path, icon, sort_order, required_plan) VALUES
      ('Dashboard',                   '/tenant/dashboard',            'Dashboard', 1,  'basic'),
      ('OPD Registration',            '/tenant/opd/registration',     'OPD',       2,  'basic'),
      ('Doctor''s Queue',             '/tenant/opd/queue',            'Doctor',    3,  'basic'),
      ('Invoicing & Billing',         '/billing',                     'Billing',   10, 'basic'),
      ('Branding & UI Settings',      '/tenant/settings',             'Settings',  12, 'basic'),
      ('Staff & RBAC',                '/tenant/staff',                'Doctor',    13, 'basic'),
      ('Laboratory',                  '/tenant/lab',                  'Lab',       4,  'standard'),
      ('Pharmacy Dashboard',          '/tenant/pharmacy/dashboard',   'Pharmacy',  5,  'standard'),
      ('Stock Inventory',             '/tenant/pharmacy/inventory',   'Pill',      6,  'standard'),
      ('Prescription Queue',          '/tenant/pharmacy/queue',       'Receipt',   7,  'standard'),
      ('Hospital Settings (Masters)', '/tenant/masters',              'Settings',  11, 'standard'),
      ('IPD Bed Map',                 '/tenant/ipd/beds',             'Bed',       8,  'professional'),
      ('IPD Census & Daycare',        '/tenant/ipd/admissions',       'Clipboard', 9,  'professional'),
      ('Discharge Summaries',         '/tenant/ipd/discharge',        'Receipt',   15, 'professional'),
      ('Insurance Management',        '/tenant/billing/insurance',    'Receipt',   14, 'professional')
      ON CONFLICT (label) DO NOTHING
    `);

    // 4. Seed role-menu mappings per standard RBAC matrix
    // ADMIN → ALL menus
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
      WHERE r.name = 'ADMIN'
      ON CONFLICT DO NOTHING
    `);
    // DOCTOR → Dashboard, Doctor's Queue, Laboratory
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
      WHERE r.name = 'DOCTOR' AND m.label IN ('Dashboard', 'Doctor''s Queue', 'Laboratory')
      ON CONFLICT DO NOTHING
    `);
    // NURSE → Dashboard only
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
      WHERE r.name = 'NURSE' AND m.label IN ('Dashboard')
      ON CONFLICT DO NOTHING
    `);
    // PHARMACIST → Dashboard + pharmacy menus
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
      WHERE r.name = 'PHARMACIST' AND m.label IN ('Dashboard', 'Pharmacy Dashboard', 'Stock Inventory', 'Prescription Queue')
      ON CONFLICT DO NOTHING
    `);
    // LAB_TECH → Dashboard + Laboratory
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
      WHERE r.name = 'LAB_TECH' AND m.label IN ('Dashboard', 'Laboratory')
      ON CONFLICT DO NOTHING
    `);
    // RECEPTIONIST → Dashboard + OPD Registration
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
      WHERE r.name = 'RECEPTIONIST' AND m.label IN ('Dashboard', 'OPD Registration')
      ON CONFLICT DO NOTHING
    `);
    // SUPPORT → Dashboard only
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".rbac_role_menus (role_id, menu_id)
      SELECT r.id, m.id FROM "${schema}".rbac_roles r, "${schema}".rbac_menus m
      WHERE r.name = 'SUPPORT' AND m.label IN ('Dashboard')
      ON CONFLICT DO NOTHING
    `);

    // 5. Link all existing users to their RBAC roles via role name mapping
    const roleNameMap = {
      'admin': 'ADMIN', 'doctor': 'DOCTOR', 'nurse': 'NURSE',
      'pharmacist': 'PHARMACIST', 'lab_assistant': 'LAB_TECH', 'lab_tech': 'LAB_TECH',
      'receptionist': 'RECEPTIONIST', 'staff': 'SUPPORT', 'support': 'SUPPORT'
    };
    const users = await req.prisma.$queryRawUnsafe(`SELECT id, role FROM "${schema}".users`);
    for (const u of users) {
      if (u.role) {
        const mappedRole = roleNameMap[u.role.toLowerCase()] || 'SUPPORT';
        await req.prisma.$executeRawUnsafe(`
          INSERT INTO "${schema}".rbac_user_roles (user_id, role_id)
          SELECT '${u.id}', id FROM "${schema}".rbac_roles WHERE name = '${mappedRole}'
          ON CONFLICT DO NOTHING
        `);
      }
    }

    console.log(`[RBAC_SYNC] Completed for ${schema}`);
    res.json({ message: "RBAC fully synchronized — roles, menus, mappings and user links all up to date." });
  } catch (error) { 
    console.error(`[RBAC_SYNC] Error: ${error.message}`);
    next(error); 
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    // Use 24-hour rolling window for "Today" to handle timezone offsets gracefully
    const patientInflow = await req.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "${req.schemaName}".patients WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const activeAdmissions = await req.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "${req.schemaName}".encounters WHERE type = 'IPD' AND status = 'Active'
    `);

    const pendingBills = await req.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "${req.schemaName}".invoices WHERE status = 'Unpaid'
    `);

    const dailyRevenue = await req.prisma.$queryRawUnsafe(`
      SELECT SUM(total) as sum FROM "${req.schemaName}".invoices WHERE status = 'PAID' AND created_at > NOW() - INTERVAL '24 hours'
    `);

    const dailyCollection = await req.prisma.$queryRawUnsafe(`
      SELECT SUM(total) as sum FROM "${req.schemaName}".invoices WHERE status = 'PAID' AND payment_mode != 'Insurance' AND created_at > NOW() - INTERVAL '24 hours'
    `);

    const pendingInsurance = await req.prisma.$queryRawUnsafe(`
      SELECT SUM(total) as sum FROM "${req.schemaName}".invoices WHERE payment_mode = 'Insurance' AND status = 'Unpaid'
    `);

    // Weekly flow data - ensure we have data for last 7 days
    const weeklyFlow = await req.prisma.$queryRawUnsafe(`
      SELECT d.date, COALESCE(p.count, 0) as count
      FROM (
        SELECT (CURRENT_DATE - (n || ' days')::interval)::date as date
        FROM generate_series(0, 6) n
      ) d
      LEFT JOIN (
        SELECT created_at::date as date, COUNT(*) as count 
        FROM "${req.schemaName}".patients 
        WHERE created_at > CURRENT_DATE - INTERVAL '14 days'
        GROUP BY created_at::date
      ) p ON d.date = p.date
      ORDER BY d.date ASC
    `);

    const departmentLoad = await req.prisma.$queryRawUnsafe(`
      SELECT type as name, COUNT(*) as count 
      FROM "${req.schemaName}".encounters 
      WHERE status = 'Active' 
      GROUP BY type
    `);

    res.json({
      metrics: {
        patientInflow: Number(patientInflow[0]?.count || 0),
        activeAdmissions: Number(activeAdmissions[0]?.count || 0),
        pendingBills: Number(pendingBills[0]?.count || 0),
        dailyRevenue: Number(dailyRevenue[0]?.sum || 0),
        dailyCollection: Number(dailyCollection[0]?.sum || 0),
        pendingInsurance: Number(pendingInsurance[0]?.sum || 0)
      },
      weeklyFlow: weeklyFlow.map(w => ({
        date: w.date,
        count: Number(w.count)
      })),
      departmentLoad: departmentLoad.map(d => ({
        name: d.name,
        count: Number(d.count)
      }))
    });
  } catch (error) { 
    console.error("[STATS ERROR]", error);
    next(error); 
  }
});

// 7. Diagnostics
router.get("/masters/diagnostics", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT d.*, dt.name as type_name 
      FROM "${req.schemaName}".diagnostics d
      LEFT JOIN "${req.schemaName}".diagnostic_types dt ON d.type_id = dt.id
      ORDER BY d.name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/masters/diagnostics", async (req, res, next) => {
  try {
    const { name, price, type_id } = req.body;
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".diagnostics (name, price, type_id) 
      VALUES ('${name.replace(/'/g, "''")}', ${price || 0}, ${type_id ? `'${type_id}'` : 'NULL'})
    `);
    res.status(201).json({ message: "Diagnostic test added" });
  } catch (error) { next(error); }
});

module.exports = router;
