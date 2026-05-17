const express = require("express");
const router = express.Router();
const upload = require("../../config/upload");
const aiService = require("../../services/aiService");

async function ensurePatientColumns(req) {
  const columns = [
    'mrn VARCHAR(20)',
    'email VARCHAR(255)',
    'gender VARCHAR(20)',
    'age INTEGER DEFAULT 0',
    'dob DATE',
    'blood_group VARCHAR(10)',
    'occupation VARCHAR(100)',
    'address TEXT',
    'guardian_name VARCHAR(255)',
    'guardian_phone VARCHAR(50)',
    'medical_history TEXT',
    'allergies TEXT',
    'ai_summary TEXT',
    'abha_id VARCHAR(50)',
    'abha_number VARCHAR(50)',
    'abha_status VARCHAR(20)',
    'abha_verified BOOLEAN DEFAULT FALSE',
    'abha_linked_at TIMESTAMP',
    'created_at TIMESTAMP DEFAULT NOW()'
  ];
  
  const abhaAuditLogs = [
    'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    'patient_id VARCHAR(100)',
    'api_name VARCHAR(100)',
    'txn_id VARCHAR(100)',
    'status VARCHAR(20)',
    'error_message TEXT',
    'request_payload JSONB',
    'response_payload JSONB',
    'created_at TIMESTAMP DEFAULT NOW()'
  ];

  for (const col of columns) {
    try {
      await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".patients ADD COLUMN IF NOT EXISTS ${col}`);
    } catch (e) {}
  }

  // Ensure Audit Log Table exists
  try {
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".abha_audit_logs (
        ${abhaAuditLogs.join(', ')}
      )
    `);
  } catch (e) {
    console.error(`[PATIENT_HEAL] ABHA Audit Table failed: ${e.message}`);
  }
}

router.get("/", async (req, res, next) => {
  try {
    await ensurePatientColumns(req);
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
    await ensurePatientColumns(req);

    const { 
      name, phone, email, gender, age, dob, 
      blood_group, occupation, address, 
      guardian_name, guardian_phone, 
      medical_history, allergies, 
      abhaId, abhaNumber, abhaStatus, abhaVerified
    } = req.body;
    
    // Healthcare Standard MRN Generation: MRN-[YYMM]-[6-Digit Sequence]
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    
    const sequence = String(Date.now()).slice(-6);
    
    const mrn = `MRN-${yy}${mm}-${sequence}`;
    
    // SQL Sanitization Helpers
    const s = (val) => val ? val.toString().replace(/'/g, "''") : '';
    
    let aiSummary = '';
    
    // Generate AI Summary if files were uploaded
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map(f => f.path);
      aiSummary = await aiService.generatePatientHistorySummary(filePaths);
    }
    
    const safeSummary = s(aiSummary);

    const query = `
      INSERT INTO "${req.schemaName}".patients (
        mrn, name, phone, email, gender, age, dob, 
        blood_group, occupation, address, 
        guardian_name, guardian_phone, 
        medical_history, allergies, ai_summary, 
        abha_id, abha_number, abha_status, abha_verified, abha_linked_at
      ) 
      VALUES (
        '${mrn}', '${s(name)}', '${s(phone)}', '${s(email)}', '${s(gender)}', ${parseInt(age) || 0}, 
        ${dob ? `'${dob}'` : 'NULL'}, '${s(blood_group)}', '${s(occupation)}', '${s(address)}', 
        '${s(guardian_name)}', '${s(guardian_phone)}', 
        '${s(medical_history)}', '${s(allergies)}', '${safeSummary}', 
        '${s(abhaId)}', '${s(abhaNumber)}', '${s(abhaStatus)}', ${abhaVerified ? 'TRUE' : 'FALSE'}, 
        ${abhaVerified ? 'NOW()' : 'NULL'}
      )
      RETURNING *
    `;

    const result = await req.prisma.$queryRawUnsafe(query);
    res.status(201).json(result[0]);
  } catch (error) { 
    console.error("[PATIENT] Registration failed:", error);
    res.status(500).json({ 
      error: "Registration failed", 
      message: error.message,
      details: error.code === 'P2010' ? "Database schema mismatch (possibly missing ai_summary column)" : error.message
    });
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
