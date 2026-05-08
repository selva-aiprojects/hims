const express = require('express');
const router = express.Router();

// --- Doctor Availability Management ---

// Get doctor's availability
router.get("/:doctorId/availability", async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;
    
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".doctor_availability 
      WHERE doctor_id = '${doctorId}'
      AND date >= '${startDate || new Date().toISOString().split('T')[0]}'
      AND date <= '${endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}'
      ORDER BY date ASC, start_time ASC
    `);
    
    res.json(data);
  } catch (error) { next(error); }
});

// Set bulk doctor availability (Leave Management / Block Multiple)
router.post("/:doctorId/bulk-availability", async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { dates, startTime, endTime, isAvailable } = req.body;
    
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Dates array is required" });
    }

    // Schema Healing: Ensure the table and unique constraint exist
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".doctor_availability (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        recurring_pattern VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ensure UNIQUE constraint for ON CONFLICT to work
    try {
      await req.prisma.$executeRawUnsafe(`
        ALTER TABLE "${req.schemaName}".doctor_availability 
        ADD CONSTRAINT doctor_avail_unique UNIQUE (doctor_id, date, start_time)
      `);
    } catch (e) {
      // Ignore if constraint already exists
    }

    const values = [];
    let curH = parseInt(startTime.split(':')[0]);
    let curM = parseInt(startTime.split(':')[1]);
    const endH = parseInt(endTime.split(':')[0]);
    const endM = parseInt(endTime.split(':')[1]);

    const timeSlots = [];
    while (curH < endH || (curH === endH && curM < endM)) {
      const slotStart = `${curH.toString().padStart(2, '0')}:${curM.toString().padStart(2, '0')}:00`;
      curM += 30;
      if (curM >= 60) { curM = 0; curH++; }
      const slotEnd = `${curH.toString().padStart(2, '0')}:${curM.toString().padStart(2, '0')}:00`;
      timeSlots.push({ start: slotStart, end: slotEnd });
    }

    for (const d of dates) {
      for (const slot of timeSlots) {
        values.push(`('${doctorId}', '${d}', '${slot.start}', '${slot.end}', ${isAvailable ? 'TRUE' : 'FALSE'})`);
      }
    }

    if (values.length > 0) {
      const query = `
        INSERT INTO "${req.schemaName}".doctor_availability 
        (doctor_id, date, start_time, end_time, is_available)
        VALUES ${values.join(',')}
        ON CONFLICT (doctor_id, date, start_time) 
        DO UPDATE SET 
          is_available = EXCLUDED.is_available,
          end_time = EXCLUDED.end_time,
          updated_at = NOW()
      `;
      await req.prisma.$executeRawUnsafe(query);
    }
    
    res.json({ message: `Successfully updated availability for ${dates.length} days.` });
  } catch (error) { 
    console.error("[DOCTOR_AVAILABILITY] Bulk Update Failed:", error.message);
    res.status(500).json({ error: "Database Sync Failed", details: error.message });
  }
});

// Set doctor availability
router.post("/:doctorId/availability", async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date, startTime, endTime, isAvailable, recurringPattern } = req.body;
    
    // Use parameterized query for safety
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".doctor_availability 
      (doctor_id, date, start_time, end_time, is_available, recurring_pattern)
      VALUES ($1::uuid, $2::date, $3::time, $4::time, $5::boolean, $6)
      ON CONFLICT (doctor_id, date, start_time) 
      DO UPDATE SET
        end_time = EXCLUDED.end_time,
        is_available = EXCLUDED.is_available,
        recurring_pattern = EXCLUDED.recurring_pattern,
        updated_at = NOW()
      RETURNING *
    `, doctorId, date, startTime, endTime, isAvailable, recurringPattern || null);
    
    res.status(201).json(result[0]);
  } catch (error) { 
    console.error("[AVAILABILITY_ERROR]", error.message);
    res.status(500).json({ error: "Failed to update availability", details: error.message });
  }
});

// Update doctor availability
router.put("/:doctorId/availability/:id", async (req, res, next) => {
  try {
    const { doctorId, id } = req.params;
    const { startTime, endTime, isAvailable } = req.body;
    
    await req.prisma.$queryRawUnsafe(`
      UPDATE "${req.schemaName}".doctor_availability 
      SET start_time = '${startTime}', 
          end_time = '${endTime}', 
          is_available = ${isAvailable}
      WHERE id = '${id}' AND doctor_id = '${doctorId}'
    `);
    
    res.json({ message: "Availability updated successfully" });
  } catch (error) { next(error); }
});

// Delete doctor availability
router.delete("/:doctorId/availability/:id", async (req, res, next) => {
  try {
    const { doctorId, id } = req.params;
    
    await req.prisma.$queryRawUnsafe(`
      DELETE FROM "${req.schemaName}".doctor_availability 
      WHERE id = '${id}' AND doctor_id = '${doctorId}'
    `);
    
    res.sendStatus(204);
  } catch (error) { next(error); }
});

// Get doctor's schedule (appointments + availability)
router.get("/:doctorId/schedule", async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Get appointments
    const appointments = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, p.email as patient_email
      FROM "${req.schemaName}".appointments a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      WHERE a.doctor_id = '${doctorId}'
      AND a.appointment_time >= '${startDate || new Date().toISOString().split('T')[0]}'
      AND a.appointment_time <= '${endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}'
      ORDER BY a.appointment_time ASC
    `);
    
    // Get availability
    const availability = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".doctor_availability 
      WHERE doctor_id = '${doctorId}'
      AND date >= '${startDate || new Date().toISOString().split('T')[0]}'
      AND date <= '${endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}'
      ORDER BY date ASC, start_time ASC
    `);
    
    res.json({ appointments, availability });
  } catch (error) { next(error); }
});

// Get available time slots for a specific date
router.get("/:doctorId/available-slots", async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    // Get doctor's availability for the date
    const availability = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".doctor_availability 
      WHERE doctor_id = '${doctorId}' AND date = '${date}'
    `);
    
    // Get existing appointments for the date
    const appointments = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".appointments 
      WHERE doctor_id = '${doctorId}' 
      AND DATE(appointment_time) = '${date}'
      AND status != 'Cancelled'
    `);
    
    // Generate available time slots
    const generateTimeSlots = (startTime, endTime) => {
      const slots = [];
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`);
        currentMin += 30;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour++;
        }
      }
      
      return slots;
    };
    
    const availableSlots = [];
    
    if (availability.length > 0) {
      const dayAvailability = availability[0];
      if (dayAvailability.is_available) {
        const slots = generateTimeSlots(dayAvailability.start_time, dayAvailability.end_time);
        
        // Filter out booked slots
        for (const slot of slots) {
          const [slotHour, slotMin] = slot.split(':').map(Number);
          const slotTime = new Date(`${date} ${slot}`);
          
          const isBooked = appointments.some((apt) => {
            const aptTime = new Date(apt.appointment_time);
            const [aptHour, aptMin] = [aptTime.getHours(), aptTime.getMinutes()];
            
            // Check if appointment overlaps with the slot (30-minute slots)
            return (aptHour === slotHour && Math.abs(aptMin - slotMin) < 30);
          });
          
          if (!isBooked) {
            availableSlots.push({
              time: slot,
              available: true
            });
          }
        }
      }
    }
    
    res.json(availableSlots);
  } catch (error) { next(error); }
});


// --- Enterprise Scheduling Endpoints ---



// Schema Healing for Enterprise Scheduling
const ensureEnterpriseTables = async (req) => {
  if (!req.schemaName) {
    console.error("[DOCTOR_ADMIN_HEALING] Error: req.schemaName is missing.");
    throw new Error("Tenant schema not identified. Please ensure x-tenant-id header is present.");
  }

  try {
    // Ensure Extensions
    await req.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await req.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // 1. Doctor Weekly Schedule
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".doctor_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL,
        weekday INTEGER NOT NULL,
        session_name VARCHAR(100),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        slot_duration INTEGER DEFAULT 30,
        consultation_type VARCHAR(50) DEFAULT 'OPD',
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Doctor Leaves
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".doctor_leaves (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        reason TEXT,
        is_emergency BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 3. Availability Overrides
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".doctor_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL,
        override_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 4. Doctor Live Status (Delayed, Emergency, At Hospital)
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${req.schemaName}".doctor_status (
        doctor_id UUID PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        delay_minutes INTEGER DEFAULT 0,
        current_location VARCHAR(100),
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error(`[DOCTOR_ADMIN_HEALING] Failed for ${req.schemaName}:`, err.message);
    throw err;
  }
};


// Schedules
router.get("/:doctorId/schedules", async (req, res, next) => {
  try {
    await ensureEnterpriseTables(req);
    const { doctorId } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".doctor_schedules WHERE doctor_id = '${doctorId}'
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/schedules", async (req, res, next) => {
  try {
    await ensureEnterpriseTables(req);
    const { doctor_id, weekday, session_name, start_time, end_time, slot_duration, consultation_type, location, is_active } = req.body;
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".doctor_schedules 
      (doctor_id, weekday, session_name, start_time, end_time, slot_duration, consultation_type, location, is_active)
      VALUES ('${doctor_id}', ${weekday}, '${session_name}', '${start_time}', '${end_time}', ${slot_duration}, '${consultation_type}', '${location || ''}', ${is_active})
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});

// Leaves
router.get("/:doctorId/leaves", async (req, res, next) => {
  try {
    await ensureEnterpriseTables(req);
    const { doctorId } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".doctor_leaves WHERE doctor_id = '${doctorId}'
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/leaves", async (req, res, next) => {
  try {
    await ensureEnterpriseTables(req);
    const { doctor_id, leave_type, start_date, end_date, start_time, end_time, reason, is_emergency } = req.body;
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".doctor_leaves 
      (doctor_id, leave_type, start_date, end_date, start_time, end_time, reason, is_emergency)
      VALUES ('${doctor_id}', '${leave_type}', '${start_date}', '${end_date}', ${start_time ? `'${start_time}'` : 'NULL'}, ${end_time ? `'${end_time}'` : 'NULL'}, '${reason || ''}', ${is_emergency})
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});


router.delete("/leaves/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".doctor_leaves WHERE id = '${id}'`);
    res.sendStatus(204);
  } catch (error) { next(error); }
});

router.get("/:doctorId/overrides", async (req, res, next) => {
  try {
    await ensureEnterpriseTables(req);
    const { doctorId } = req.params;
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT * FROM "${req.schemaName}".doctor_overrides WHERE doctor_id = '${doctorId}'
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/overrides", async (req, res, next) => {
  try {
    await ensureEnterpriseTables(req);
    const { doctor_id, override_date, start_time, end_time, is_available, reason } = req.body;
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".doctor_overrides 
      (doctor_id, override_date, start_time, end_time, is_available, reason)
      VALUES ('${doctor_id}', '${override_date}', '${start_time}', '${end_time}', ${is_available}, '${reason || ''}')
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});


router.delete("/overrides/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".doctor_overrides WHERE id = '${id}'`);
    res.sendStatus(204);
  } catch (error) { next(error); }
});


router.get("/:doctorId/availability-rules", async (req, res, next) => {
  try {

    await ensureEnterpriseTables(req);
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    const schedules = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".doctor_schedules WHERE doctor_id = '${doctorId}' AND is_active = true`);
    const leaves = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".doctor_leaves WHERE doctor_id = '${doctorId}' AND end_date >= '${startDate}' AND start_date <= '${endDate}'`);
    const overrides = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".doctor_overrides WHERE doctor_id = '${doctorId}' AND override_date >= '${startDate}' AND override_date <= '${endDate}'`);
    const appointments = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name 
      FROM "${req.schemaName}".appointments a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      WHERE a.doctor_id = '${doctorId}' AND a.appointment_time >= '${startDate}' AND a.appointment_time <= '${endDate}'
    `);

    const statusRes = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".doctor_status WHERE doctor_id = '${doctorId}'`);
    const status = statusRes[0] || { status: 'AVAILABLE', delay_minutes: 0 };

    res.json({
      schedules,
      leaves,
      overrides,
      appointments,
      status
    });
  } catch (error) { next(error); }
});

// --- DOCTOR ANALYTICS ENGINE ---
router.get("/:doctorId/stats", async (req, res, next) => {
  try {
    await ensureEnterpriseTables(req);
    const { doctorId } = req.params;
    const schema = req.schemaName;

    // 1. Revenue (Consultation + linked services)
    const revenueRes = await req.prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(unit_price), 0)::float as total 
      FROM "${schema}".billing_queue 
      WHERE source_id = '${doctorId}'
    `);

    // 2. Patient Retention (Repeat patients / Total patients)
    const retentionRes = await req.prisma.$queryRawUnsafe(`
      WITH doctor_patients AS (
        SELECT patient_id, COUNT(*) as visit_count
        FROM "${schema}".encounters
        WHERE doctor_id = '${doctorId}'
        GROUP BY patient_id
      )
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0 
          ELSE (COUNT(CASE WHEN visit_count > 1 THEN 1 END)::float / COUNT(*)::float) * 100 
        END as rate
      FROM doctor_patients
    `);

    // 3. Average Wait Time (Fuzzy match between appointment and encounter)
    const waitRes = await req.prisma.$queryRawUnsafe(`
      SELECT AVG(EXTRACT(EPOCH FROM (e.created_at - a.appointment_time))/60)::float as avg_wait
      FROM "${schema}".appointments a
      JOIN "${schema}".encounters e ON a.patient_id = e.patient_id 
        AND a.doctor_id = e.doctor_id
        AND e.created_at >= a.appointment_time
        AND e.created_at < a.appointment_time + INTERVAL '4 hours'
      WHERE a.doctor_id = '${doctorId}'
    `);

    // 4. Utilization (Booked slots vs Possible slots in last 30 days)
    const utilizationRes = await req.prisma.$queryRawUnsafe(`
      WITH booked AS (
        SELECT COUNT(*)::float as count 
        FROM "${schema}".appointments 
        WHERE doctor_id = '${doctorId}' 
        AND appointment_time > NOW() - INTERVAL '30 days'
      ),
      possible AS (
        -- Simple heuristic: Average 4 hours per day for 22 working days, 2 slots per hour
        SELECT (22 * 4 * 2)::float as count
      )
      SELECT (booked.count / possible.count) * 100 as rate
      FROM booked, possible
    `);

    res.json({
      revenue: revenueRes[0]?.total || 0,
      retention: retentionRes[0]?.rate || 0,
      avgWait: waitRes[0]?.avg_wait || 0,
      utilization: Math.min(utilizationRes[0]?.rate || 0, 100)
    });
  } catch (error) {
    console.error("[DOCTOR_STATS_ERROR]", error);
    res.status(500).json({ error: "Failed to fetch doctor stats" });
  }
});

// Update Doctor Live Status
router.post("/:doctorId/status", async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { status, delay_minutes, current_location } = req.body;
    
    await req.prisma.$executeRawUnsafe(`
      INSERT INTO "${req.schemaName}".doctor_status (doctor_id, status, delay_minutes, current_location, last_updated)
      VALUES ('${doctorId}', '${status}', ${delay_minutes || 0}, '${current_location || ''}', NOW())
      ON CONFLICT (doctor_id) DO UPDATE SET
        status = EXCLUDED.status,
        delay_minutes = EXCLUDED.delay_minutes,
        current_location = EXCLUDED.current_location,
        last_updated = NOW()
    `);
    
    res.json({ message: "Doctor status updated" });
  } catch (error) { next(error); }
});

module.exports = router;

