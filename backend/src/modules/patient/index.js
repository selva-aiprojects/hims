const express = require("express");
const router = express.Router();
const upload = require("../../config/upload");
const aiService = require("../../services/aiService");

router.get("/", async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const query = search 
      ? `SELECT * FROM "${req.schemaName}".patients WHERE name ILIKE '%${search}%' OR phone ILIKE '%${search}%' OR mrn ILIKE '%${search}%' ORDER BY name ASC`
      : `SELECT * FROM "${req.schemaName}".patients ORDER BY name ASC`;
    const patients = await req.prisma.$queryRawUnsafe(query);
    res.json(patients);
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const patients = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".patients WHERE id = '${req.params.id}'`);
    res.json(patients[0] || null);
  } catch (error) { next(error); }
});

router.post("/", upload.array('history_files', 5), async (req, res, next) => {
  console.log(`[PATIENT] Incoming registration request for schema: ${req.schemaName}`);
  try {
    const { name, phone, gender, age } = req.body;
    
    // Improved unique MRN generation
    const mrn = `MRN-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
    
    // Sanitize name for SQL (escape single quotes)
    const safeName = name ? name.replace(/'/g, "''") : 'Unknown';
    
    let aiSummary = '';
    
    // Generate AI Summary if files were uploaded
    if (req.files && req.files.length > 0) {
      console.log(`[PATIENT] Processing ${req.files.length} uploaded files for AI Summary...`);
      const filePaths = req.files.map(f => f.path);
      aiSummary = await aiService.generatePatientHistorySummary(filePaths);
      console.log(`[PATIENT] AI Summary generated successfully.`);
    }
    
    const safeSummary = aiSummary.replace(/'/g, "''");

    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".patients (mrn, name, phone, gender, age, ai_summary) 
      VALUES ('${mrn}', '${safeName}', '${phone || ''}', '${gender || 'Male'}', ${parseInt(age) || 0}, '${safeSummary}')
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { 
    console.error("[PATIENT] Registration failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, phone, gender, age } = req.body;
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".patients 
      SET name = '${name}', phone = '${phone}', gender = '${gender}', age = ${age}
      WHERE id = '${req.params.id}'
    `);
    res.json({ message: "Patient updated" });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".patients WHERE id = '${req.params.id}'`);
    res.sendStatus(204);
  } catch (error) { next(error); }
});

module.exports = router;