const express = require("express");
const router = express.Router();

// --- Staff & Management ---

router.get("/staff", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT id, name, role, email, created_at FROM "${req.schemaName}".users ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/staff", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password || "HIMS@123", 10);
    
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".users (name, email, password_hash, role)
      VALUES ('${name}', '${email}', '${hashedPassword}', '${role || 'staff'}')
    `);
    res.status(201).json({ message: "Staff member created" });
  } catch (error) { 
    if (error.message.includes("unique constraint") || error.message.includes("already exists")) {
      return res.status(400).json({ error: "A staff member with this email already exists." });
    }
    next(error); 
  }
});

// --- Master Data Management ---

// 1. Departments
router.get("/masters/departments", async (req, res, next) => {
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

// --- Laboratory ---

router.get("/lab/orders", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT lo.*, p.name as patient_name, d.name as test_name
      FROM "${req.schemaName}".lab_orders lo
      JOIN "${req.schemaName}".encounters e ON lo.encounter_id = e.id
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".diagnostics d ON lo.diagnostic_id = d.id
      WHERE lo.status = 'Pending'
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.put("/lab/orders/:id", async (req, res, next) => {
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

router.get("/pharmacy/inventory", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT id, name as drug_name, category, stock_quantity, unit_price, expiry_date 
      FROM "${req.schemaName}".medicines 
      ORDER BY name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/pharmacy/dispense", async (req, res, next) => {
  try {
    const { drugId, quantity, encounterId } = req.body;
    
    // 1. Check/Decrement Stock
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".medicines 
      SET stock_quantity = stock_quantity - ${quantity}
      WHERE id = '${drugId}' AND stock_quantity >= ${quantity}
    `);
    
    // 2. Record in dispensed (Simplified for now)
    // You could add a pharmacy_dispenses record here
    
    res.json({ message: "Medicine dispensed" });
  } catch (error) { next(error); }
});

// --- IPD / Wards ---

router.get("/masters/wards", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".wards ORDER BY name ASC`);
    res.json(data);
  } catch (error) { next(error); }
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

    res.json({
      metrics: {
        patientInflow: Number(patientInflow[0]?.count || 0),
        activeAdmissions: Number(activeAdmissions[0]?.count || 0),
        pendingBills: Number(pendingBills[0]?.count || 0),
        dailyRevenue: Number(dailyRevenue[0]?.sum || 0)
      },
      weeklyFlow: weeklyFlow.map(w => ({
        date: w.date,
        count: Number(w.count)
      }))
    });
  } catch (error) { 
    console.error("[STATS ERROR]", error);
    next(error); 
  }
});

module.exports = router;
