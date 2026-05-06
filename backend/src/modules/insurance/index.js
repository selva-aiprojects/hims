const express = require("express");
const router = express.Router();

// 1. Fetch Insurance Providers (TPAs)
router.get("/providers", async (req, res, next) => {
  try {
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
