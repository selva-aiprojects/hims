const express = require("express");
const router = express.Router();

function formatTimeField(val) {
  if (!val) return "00:00";
  if (val instanceof Date) {
    try {
      const iso = val.toISOString(); // e.g. "1970-01-01T09:00:00.000Z"
      const parts = iso.split('T');
      if (parts.length > 1) {
        return parts[1].substring(0, 5); // "09:00"
      }
    } catch (e) {}
    
    const hours = String(val.getHours()).padStart(2, '0');
    const minutes = String(val.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  const str = String(val);
  if (str.includes(':')) {
    return str.substring(0, 5);
  }
  return str;
}

function parseTimeToMinutes(val) {
  if (!val) return 0;
  const timeStr = formatTimeField(val);
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function isSlotOnLeave(dateStr, timeStr, leave) {
  if (!leave.start_date || !leave.end_date) return false;
  
  const getLocalDateString = (d) => {
    if (d instanceof Date) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(d).substring(0, 10);
  };
  
  const start = getLocalDateString(leave.start_date);
  const end = getLocalDateString(leave.end_date);
  
  if (dateStr < start || dateStr > end) {
    return false;
  }
  
  if (dateStr > start && dateStr < end) {
    return true;
  }
  
  const isStartDay = dateStr === start;
  const isEndDay = dateStr === end;
  
  const slotMins = parseTimeToMinutes(timeStr);
  const leaveStartMins = leave.start_time ? parseTimeToMinutes(leave.start_time) : 0;
  const leaveEndMins = leave.end_time ? parseTimeToMinutes(leave.end_time) : 24 * 60;
  
  if (isStartDay && isEndDay) {
    return slotMins >= leaveStartMins && slotMins < leaveEndMins;
  } else if (isStartDay) {
    return slotMins >= leaveStartMins;
  } else if (isEndDay) {
    return slotMins < leaveEndMins;
  }
  
  return false;
}

async function validateDoctorAvailability(prisma, schemaName, doctor_id, appointment_time, appointment_id = null) {
  // Parse date and time directly from string to avoid timezone shifts
  const dateStr = appointment_time.split('T')[0];
  const timeStr = appointment_time.split('T')[1].substring(0, 5);
  const dateObj = new Date(`${dateStr}T${timeStr}:00`);
  const weekday = dateObj.getDay();

  // 1. Fetch schedules, overrides, and leaves
  const schedules = await prisma.$queryRawUnsafe(`
    SELECT * FROM "${schemaName}".doctor_schedules 
    WHERE doctor_id = '${doctor_id}' AND weekday = ${weekday} AND is_active = true
  `);

  const overrides = await prisma.$queryRawUnsafe(`
    SELECT * FROM "${schemaName}".doctor_overrides 
    WHERE doctor_id = '${doctor_id}' AND override_date = '${dateStr}'
  `);

  const leaves = await prisma.$queryRawUnsafe(`
    SELECT * FROM "${schemaName}".doctor_leaves 
    WHERE doctor_id = '${doctor_id}' AND start_date <= '${dateStr}' AND end_date >= '${dateStr}'
  `);

  // 2. Validate that the time falls on a valid slot boundary based on schedules
  let slotFound = false;
  let slotIsAvailable = false;
  let slotReason = "Time slot is outside doctor's regular working hours. Please create an override first.";

  schedules.forEach((schedule) => {
    const duration = schedule.slot_duration || 30;
    const startMins = parseTimeToMinutes(schedule.start_time);
    const endMins = parseTimeToMinutes(schedule.end_time);
    
    let currentMins = startMins;
    while (currentMins + duration <= endMins) {
      const slotTime = `${Math.floor(currentMins / 60).toString().padStart(2, '0')}:${(currentMins % 60).toString().padStart(2, '0')}`;
      
      if (slotTime === timeStr) {
        slotFound = true;
        
        // Check leaves
        const leave = leaves.find(l => isSlotOnLeave(dateStr, slotTime, l));
        
        // Check overrides
        const override = overrides.find(o => {
          const slotMins = parseTimeToMinutes(slotTime);
          const oStart = parseTimeToMinutes(o.start_time);
          const oEnd = parseTimeToMinutes(o.end_time);
          return slotMins >= oStart && slotMins < oEnd;
        });
        
        if (leave) {
          slotIsAvailable = false;
          slotReason = `Doctor is on leave at this time: ${leave.leave_type || 'Leave'}.`;
        } else if (override) {
          slotIsAvailable = override.is_available;
          slotReason = override.is_available ? "Available" : `Doctor is explicitly unavailable at this time: ${override.reason || 'Blocked override'}.`;
        } else {
          slotIsAvailable = true;
          slotReason = "Available";
        }
      }
      currentMins += duration;
    }
  });

  if (!slotFound) {
    return {
      isValid: false,
      error: "Selected time does not align with any valid appointment slot boundaries."
    };
  }

  if (!slotIsAvailable) {
    return {
      isValid: false,
      error: slotReason
    };
  }

  // 3. Double Booking Check (excluding current appointment if updating)
  const idFilter = appointment_id ? `AND id != '${appointment_id}'` : '';
  const existing = await prisma.$queryRawUnsafe(`
    SELECT * FROM "${schemaName}".appointments 
    WHERE doctor_id = '${doctor_id}' 
      AND appointment_time = '${appointment_time}' 
      AND status != 'Cancelled'
      ${idFilter}
  `);

  if (existing.length > 0) {
    return {
      isValid: false,
      error: "This slot is already booked."
    };
  }

  return { isValid: true };
}

router.get("/", async (req, res, next) => {
  try {
    const { doctorId } = req.query;
    const doctorFilter = doctorId ? `WHERE a.doctor_id = '${String(doctorId).replace(/'/g, "''")}'` : '';
    const appointments = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, u.name as doctor_name
      FROM "${req.schemaName}".appointments a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      JOIN "${req.schemaName}".users u ON a.doctor_id = u.id
      ${doctorFilter}
      ORDER BY a.appointment_time ASC
    `);
    res.json(appointments);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_time, status } = req.body;
    
    const validation = await validateDoctorAvailability(
      req.prisma,
      req.schemaName,
      doctor_id,
      appointment_time
    );

    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".appointments (patient_id, doctor_id, appointment_time, status) 
      VALUES ('${patient_id}', '${doctor_id}', '${appointment_time}', '${status || 'Scheduled'}')
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});

router.get("/validate", async (req, res, next) => {
  try {
    const { doctorId, appointmentTime } = req.query;
    if (!doctorId || !appointmentTime) {
      return res.status(400).json({ error: 'doctorId and appointmentTime are required' });
    }

    const validation = await validateDoctorAvailability(
      req.prisma,
      req.schemaName,
      String(doctorId),
      String(appointmentTime)
    );

    if (!validation.isValid) {
      return res.status(200).json({ isValid: false, error: validation.error });
    }

    return res.status(200).json({ isValid: true, message: 'Selected slot is available' });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { appointment_time, status } = req.body;
    
    // 1. Validation (Same as POST) if time is changing
    if (appointment_time) {
      // Get the existing doctor_id for this appointment
      const appointment = await req.prisma.$queryRawUnsafe(`
        SELECT * FROM "${req.schemaName}".appointments WHERE id = '${req.params.id}'
      `);
      if (appointment.length === 0) {
        return res.status(404).json({ error: "Appointment not found." });
      }
      const doctor_id = appointment[0].doctor_id;

      const validation = await validateDoctorAvailability(
        req.prisma,
        req.schemaName,
        doctor_id,
        appointment_time,
        req.params.id
      );

      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
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
