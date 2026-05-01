const express = require("express");
const router = express.Router();

// --- Master Data Management ---

// 1. Departments
router.get("/masters/departments", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".departments ORDER BY name ASC`);
    console.log(`[MASTERS] Fetched ${data.length} departments for ${req.schemaName}`);
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

router.get("/encounters", async (req, res, next) => {
  try {
    const status = req.query.status || 'Draft';
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT e.*, p.name as patient_name, p.age, p.gender, u.name as doctor_name
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      JOIN "${req.schemaName}".users u ON e.doctor_id = u.id
      WHERE e.status = '${status}'
      ORDER BY e.created_at ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

module.exports = router;
