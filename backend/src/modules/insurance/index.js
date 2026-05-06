const express = require("express");
const router = express.Router();

async function ensureInsuranceTables(req) {
  // Ensure tables exist
  await req.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".insurance_providers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      contact_person VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${req.schemaName}".insurance_claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL,
      provider_id UUID,
      policy_number VARCHAR(100),
      insurer_id VARCHAR(100),
      claim_type VARCHAR(50) DEFAULT 'CASHLESS',
      billed_amount NUMERIC DEFAULT 0,
      sanctioned_amount NUMERIC DEFAULT 0,
      reference_number VARCHAR(100),
      claim_number VARCHAR(100),
      status VARCHAR(50) DEFAULT 'PRE-AUTH PENDING',
      remarks TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Self-healing columns
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_providers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_claims ADD COLUMN IF NOT EXISTS provider_id UUID`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_claims ADD COLUMN IF NOT EXISTS billed_amount NUMERIC DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_claims ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC DEFAULT 0`);
  await req.prisma.$executeRawUnsafe(`ALTER TABLE "${req.schemaName}".insurance_claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
}

// 1. Fetch Insurance Providers (TPAs)
router.get("/providers", async (req, res, next) => {
  try {
    await ensureInsuranceTables(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".insurance_providers 
      WHERE is_active = TRUE 
      ORDER BY name ASC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// 2. Fetch All Claims with Detailed Status
router.get("/claims", async (req, res, next) => {
  try {
    await ensureInsuranceTables(req);
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT c.*, p.name as patient_name, p.mrn, ip.name as provider_name
      FROM "${req.schemaName}".insurance_claims c
      JOIN "${req.schemaName}".patients p ON c.patient_id = p.id
      JOIN "${req.schemaName}".insurance_providers ip ON c.provider_id = ip.id
      ORDER BY c.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

// 3. Create/Update a Claim
router.post("/claims", async (req, res, next) => {
  try {
    const { 
      patientId, providerId, policyNumber, insurerId, 
      claimType, billedAmount, sanctionedAmount, 
      referenceNumber, claimNumber, status, remarks 
    } = req.body;

    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".insurance_claims 
      (patient_id, provider_id, policy_number, insurer_id, claim_type, billed_amount, sanctioned_amount, reference_number, claim_number, status, remarks)
      VALUES 
      ('${patientId}', '${providerId}', '${policyNumber}', '${insurerId}', '${claimType}', ${billedAmount || 0}, ${sanctionedAmount || 0}, '${referenceNumber || ''}', '${claimNumber || ''}', '${status || 'PRE-AUTH PENDING'}', '${remarks || ''}')
      RETURNING id
    `);

    res.status(201).json({ id: result[0].id, message: "Insurance claim record initialized." });
  } catch (error) { next(error); }
});

// 4. Update Sanctioned Amount / Status
router.put("/claims/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sanctionedAmount, status, claimNumber, remarks } = req.body;

    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".insurance_claims
      SET sanctioned_amount = ${sanctionedAmount || 0},
          status = '${status}',
          claim_number = '${claimNumber || ''}',
          remarks = '${remarks || ''}'
      WHERE id = '${id}'
    `);

    res.json({ message: "Claim status updated successfully." });
  } catch (error) { next(error); }
});

module.exports = router;
