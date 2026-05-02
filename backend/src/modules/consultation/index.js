const express = require("express");
const router = express.Router();

/**
 * Atomic OPD Consultation Sync
 * Saves Encounter, Vitals, Complaints, Diagnoses, and Prescriptions
 */
router.post("/", async (req, res, next) => {
  const { 
    patientId, 
    doctorId, 
    diagnosis, 
    notes, 
    vitals, 
    complaints, 
    prescriptions,
    followUpDate 
  } = req.body;

  try {
    console.log(`[OPD] Starting consultation sync for Patient: ${patientId}`);

    // 1. Create Main Encounter
    const encounter = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".encounters (patient_id, doctor_id, diagnosis, notes, status, type)
      VALUES ('${patientId}', '${doctorId}', '${diagnosis || ''}', '${notes || ''}', 'Completed', 'OPD')
      RETURNING id
    `);
    
    const encounterId = encounter[0].id;

    // 2. Save Vitals (if provided)
    if (vitals) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".vitals (encounter_id, bp, pulse, temperature)
        VALUES ('${encounterId}', '${vitals.bp || ''}', ${parseInt(vitals.pulse) || 0}, ${parseFloat(vitals.temp) || 0})
      `);
    }

    // 3. Save Complaints
    if (Array.isArray(complaints)) {
      for (const msg of complaints) {
        await req.prisma.$executeRawUnsafe(`
          INSERT INTO "${req.schemaName}".complaints (encounter_id, complaint)
          VALUES ('${encounterId}', '${msg}')
        `);
      }
    }

    // 4. Save Prescriptions
    if (Array.isArray(prescriptions)) {
      for (const p of prescriptions) {
        await req.prisma.$executeRawUnsafe(`
          INSERT INTO "${req.schemaName}".prescription_items (encounter_id, drug_name, dosage, frequency, duration)
          VALUES ('${encounterId}', '${p.drugName}', '${p.dosage || ''}', '${p.frequency || ''}', '${p.duration || ''}')
        `);
      }
    }

    // 5. Schedule Follow-up
    if (followUpDate) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".follow_ups (patient_id, encounter_id, scheduled_date)
        VALUES ('${patientId}', '${encounterId}', '${followUpDate}')
      `);
    }

    res.status(201).json({
      message: "Consultation finalized successfully",
      encounterId
    });

  } catch (error) {
    console.error("[OPD] Sync Failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res, next) => {
  try {
    const encounters = await req.prisma.$queryRawUnsafe(`
      SELECT e.*, p.name as patient_name 
      FROM "${req.schemaName}".encounters e
      JOIN "${req.schemaName}".patients p ON e.patient_id = p.id
      ORDER BY e.created_at DESC
    `);
    res.json(encounters);
  } catch (error) { next(error); }
});

module.exports = router;