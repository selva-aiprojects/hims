const express = require("express");
const router = express.Router();
const aiService = require("../../services/aiService");

/**
 * AI Consultation Advisor
 * Suggests Diagnosis, Lab Tests, and Medicines
 */
router.post("/ai-suggest", async (req, res, next) => {
  const { patientId, complaints } = req.body;
  try {
    const patients = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".patients WHERE id = '${patientId}'`);
    if (!patients.length) return res.status(404).json({ error: "Patient not found" });

    const medicines = await req.prisma.$queryRawUnsafe(`SELECT name FROM "${req.schemaName}".medicines WHERE COALESCE(is_active, true) = true`);
    const diagnostics = await req.prisma.$queryRawUnsafe(`SELECT name FROM "${req.schemaName}".diagnostics`);

    const advice = await aiService.generateClinicalAdvice(patients[0], complaints, { medicines, diagnostics });
    if (advice && advice.error === "RATE_LIMIT_EXCEEDED") {
      return res.status(429).json(advice);
    }
    res.json(advice);
  } catch (error) {
    console.error("[AI-SUGGEST] Error:", error);
    res.status(500).json({ error: "AI Suggestion failed" });
  }
});

/**
 * Predictive Analysis for Consultation
 * Predicts time, complexity, and resources
 */
router.post("/predict", async (req, res, next) => {
  const { patientId, complaints, doctorId } = req.body;
  try {
    const patients = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".patients WHERE id = '${patientId}'`);
    if (!patients.length) return res.status(404).json({ error: "Patient not found" });

    const doctorData = await req.prisma.$queryRawUnsafe(`SELECT name, specialization FROM "${req.schemaName}".users WHERE id = '${doctorId}'`);
    
    const prediction = await aiService.predictConsultationMetrics(
      patients[0], 
      complaints, 
      doctorData[0] || {}
    );

    // PERSIST PREDICTION
    try {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".consultation_predictions (encounter_id, predicted_time_mins, complexity, triage_priority, reasoning)
        VALUES ('${req.body.encounterId || ''}', ${prediction.predictedTimeMins}, '${prediction.complexity}', ${prediction.triagePriority}, '${prediction.reasoning?.replace(/'/g, "''") || ''}')
      `);
    } catch (e) { console.warn("[PREDICT] Persistence failed:", e.message); }
    
    res.json(prediction);
  } catch (error) {
    console.error("[PREDICT] Error:", error);
    res.status(500).json({ error: "Prediction failed" });
  }
});

/**
 * Record Consultation Event
 * Tracks lifecycle: CHECK_IN, CONSULT_START, PAUSE, RESUME, CONSULT_END
 */
router.post("/events", async (req, res, next) => {
  const { encounterId, eventType, metadata } = req.body;
  try {
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".consultation_events (encounter_id, event_type, metadata)
      VALUES ('${encounterId}', '${eventType}', '${JSON.stringify(metadata || {})}')
    `);
    res.json({ success: true, message: `Event ${eventType} recorded.` });
  } catch (error) {
    console.error("[EVENT] Error:", error.message);
    res.status(500).json({ error: "Failed to record event" });
  }
});

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

    // --- NEW: Push to Billing Queue (The "Pull-based" Foundation) ---
    
    // A. Push Consultation Fee (Flexible/Discountable)
    const doctorData = await req.prisma.$queryRawUnsafe(`
      SELECT u.name, s.base_consultation_fee as fee 
      FROM "${req.schemaName}".users u
      LEFT JOIN "${req.schemaName}".specialities s ON u.specialization = s.name
      WHERE u.id = '${doctorId}'
    `);
    
    const fee = doctorData[0]?.fee || 500; // Default if not set
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, source_id, description, unit_price, is_discountable)
      VALUES ('${patientId}', '${encounterId}', 'CONSULTATION', '${doctorId}', 'Consultation: ${doctorData[0]?.name || 'Doctor'}', ${fee}, TRUE)
    `);

    // B. Push Prescriptions (Fixed/Non-Discountable)
    if (Array.isArray(prescriptions)) {
      for (const p of prescriptions) {
        const medData = await req.prisma.$queryRawUnsafe(`SELECT unit_price FROM "${req.schemaName}".medicines WHERE name ILIKE '%${p.drugName.replace(/'/g, "''")}%' LIMIT 1`);
        const price = medData[0]?.unit_price || 0;
        
        await req.prisma.$executeRawUnsafe(`
          INSERT INTO "${req.schemaName}".billing_queue (patient_id, encounter_id, source_module, description, unit_price, is_discountable)
          VALUES ('${patientId}', '${encounterId}', 'PHARMACY', 'Medicine: ${p.drugName}', ${price}, FALSE)
        `);
      }
    }

    res.status(201).json({
      message: "Consultation finalized and pushed to Billing Queue",
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