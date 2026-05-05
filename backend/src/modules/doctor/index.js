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

// Set doctor availability
router.post("/:doctorId/availability", async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date, startTime, endTime, isAvailable, recurringPattern } = req.body;
    
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".doctor_availability 
      (doctor_id, date, start_time, end_time, is_available, recurring_pattern)
      VALUES ('${doctorId}', '${date}', '${startTime}', '${endTime}', ${isAvailable}, ${recurringPattern || 'NULL'})
      ON CONFLICT (doctor_id, date, start_time) 
      DO UPDATE SET
        end_time = '${endTime}',
        is_available = ${isAvailable},
        recurring_pattern = ${recurringPattern || 'NULL'}
      RETURNING *
    `);
    
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
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

module.exports = router;
