const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const appointments = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, u.name as doctor_name
      FROM "${req.schemaName}".appointments a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      JOIN "${req.schemaName}".users u ON a.doctor_id = u.id
      ORDER BY a.appointment_time ASC
    `);
    res.json(appointments);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_time, status } = req.body;
    
    // Server-side validation for doctor availability
    const dateObj = new Date(appointment_time);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
    const weekday = dateObj.getDay();

    // 1. Check for Overrides (Highest priority)
    const overrides = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".doctor_overrides 
      WHERE doctor_id = '${doctor_id}' AND override_date = '${dateStr}' 
      AND start_time <= '${timeStr}' AND end_time > '${timeStr}'
    `);
    
    let isAvailable = false;
    if (overrides.length > 0) {
      isAvailable = overrides[0].is_available;
      if (!isAvailable) {
        return res.status(400).json({ error: "Doctor is explicitly unavailable at this time (Override)." });
      }
    } else {
      // 2. Check for Leaves
      const leaves = await req.prisma.$queryRawUnsafe(`
        SELECT * FROM "${req.schemaName}".doctor_leaves 
        WHERE doctor_id = '${doctor_id}' AND start_date <= '${dateStr}' AND end_date >= '${dateStr}'
      `);
      if (leaves.length > 0) {
        return res.status(400).json({ error: "Doctor is on leave at this time." });
      }

      // 3. Check Master Schedule
      const schedules = await req.prisma.$queryRawUnsafe(`
        SELECT * FROM "${req.schemaName}".doctor_schedules 
        WHERE doctor_id = '${doctor_id}' AND weekday = ${weekday} 
        AND start_time <= '${timeStr}' AND end_time > '${timeStr}' AND is_active = true
      `);
      
      if (schedules.length > 0) {
        isAvailable = true;
      }
    }

    if (!isAvailable) {
      return res.status(400).json({ error: "Time slot is outside doctor's regular working hours. Please create an override first." });
    }

    // 4. Check for double booking
    const existing = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".appointments 
      WHERE doctor_id = '${doctor_id}' AND appointment_time = '${appointment_time}' AND status != 'Cancelled'
    `);
    if (existing.length > 0) {
      return res.status(400).json({ error: "This slot is already booked." });
    }

    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".appointments (patient_id, doctor_id, appointment_time, status) 
      VALUES ('${patient_id}', '${doctor_id}', '${appointment_time}', '${status || 'Scheduled'}')
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { appointment_time, status } = req.body;
    
    // 1. Validation (Same as POST) if time is changing
    if (appointment_time) {
      const dateObj = new Date(appointment_time);
      const dateStr = dateObj.toISOString().split('T')[0];
      const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);
      
      // Check for double booking (excluding self)
      const existing = await req.prisma.$queryRawUnsafe(`
        SELECT * FROM "${req.schemaName}".appointments 
        WHERE doctor_id = (SELECT doctor_id FROM "${req.schemaName}".appointments WHERE id = '${req.params.id}') 
        AND appointment_time = '${appointment_time}' 
        AND status != 'Cancelled'
        AND id != '${req.params.id}'
      `);
      if (existing.length > 0) {
        return res.status(400).json({ error: "The new slot is already booked." });
      }
    }

    const updates = [];
    if (appointment_time) updates.push(`appointment_time = '${appointment_time}'`);
    if (status) updates.push(`status = '${status}'`);

    if (updates.length === 0) return res.status(400).json({ error: "No updates provided" });

    const result = await req.prisma.$queryRawUnsafe(`
      UPDATE "${req.schemaName}".appointments 
      SET ${updates.join(', ')}
      WHERE id = '${req.params.id}'
      RETURNING *
    `);
    
    res.json(result[0]);
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".appointments WHERE id = '${req.params.id}'`);
    res.sendStatus(204);
  } catch (error) { next(error); }
});

module.exports = router;
