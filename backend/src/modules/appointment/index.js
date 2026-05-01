const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const appointments = await req.prisma.$queryRawUnsafe(`
      SELECT a.*, p.name as patient_name, u.name as doctor_name
      FROM "${req.schemaName}".appointments a
      JOIN "${req.schemaName}".patients p ON a.patient_id = p.id
      JOIN "${req.schemaName}".users u ON a.doctor_id = u.id
      ORDER BY a.time ASC
    `);
    res.json(appointments);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { patient_id, doctor_id, time, status } = req.body;
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".appointments (patient_id, doctor_id, time, status) 
      VALUES ('${patient_id}', '${doctor_id}', '${time}', '${status || 'Scheduled'}')
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".appointments WHERE id = '${req.params.id}'`);
    res.sendStatus(204);
  } catch (error) { next(error); }
});

module.exports = router;