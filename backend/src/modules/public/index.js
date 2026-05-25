const express = require('express');
const router = express.Router();

/**
 * Public endpoint: Accept patient complaints/voice notes without doctor auth.
 * Requires `x-tenant-id` header and `patientId` in body or path.
 */
router.post('/patients/:id/complaints', async (req, res, next) => {
  const patientId = req.params.id || req.body.patientId;
  const { complaint, notes } = req.body;

  if (!patientId) return res.status(400).json({ error: 'patientId is required' });
  if (!complaint && !notes) return res.status(400).json({ error: 'complaint or notes required' });

  try {
    // Ensure patient exists in tenant schema
    const patients = await req.prisma.$queryRawUnsafe(`SELECT id FROM "${req.schemaName}".patients WHERE id = '${patientId}'`);
    if (!patients || patients.length === 0) return res.status(404).json({ error: 'Patient not found' });

    // Create lightweight encounter (self-service) with minimal fields
    const safeNotes = (notes || '').toString().replace(/'/g, "''");
    const safeComplaint = (complaint || '').toString().replace(/'/g, "''");

    const encounter = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, diagnosis, notes, status, type)
      VALUES ('${patientId}', NULL, '', '${safeNotes}', 'Pending', 'SELF_SERVICE') RETURNING id
    `);

    const encounterId = encounter[0].id;

    // Save complaint
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".complaints (encounter_id, complaint)
      VALUES ('${encounterId}', '${safeComplaint}')
    `);

    return res.status(201).json({ message: 'Complaint recorded', encounterId });
  } catch (err) {
    console.error('[PUBLIC COMPLAINT] Error:', err.message);
    return res.status(500).json({ error: 'Failed to record complaint' });
  }
});

module.exports = router;
