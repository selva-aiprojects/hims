const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const query = search 
      ? `SELECT * FROM "${req.schemaName}".patients WHERE name ILIKE '%${search}%' OR phone ILIKE '%${search}%' ORDER BY name ASC`
      : `SELECT * FROM "${req.schemaName}".patients ORDER BY name ASC`;
    const patients = await req.prisma.$queryRawUnsafe(query);
    res.json(patients);
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const patients = await req.prisma.$queryRawUnsafe(`SELECT * FROM "${req.schemaName}".patients WHERE id = '${req.params.id}'`);
    res.json(patients[0] || null);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, phone, gender, age } = req.body;
    const result = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".patients (name, phone, gender, age) 
      VALUES ('${name}', '${phone}', '${gender}', ${age})
      RETURNING *
    `);
    res.status(201).json(result[0]);
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, phone, gender, age } = req.body;
    await req.prisma.$executeRawUnsafe(`
      UPDATE "${req.schemaName}".patients 
      SET name = '${name}', phone = '${phone}', gender = '${gender}', age = ${age}
      WHERE id = '${req.params.id}'
    `);
    res.json({ message: "Patient updated" });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.$executeRawUnsafe(`DELETE FROM "${req.schemaName}".patients WHERE id = '${req.params.id}'`);
    res.sendStatus(204);
  } catch (error) { next(error); }
});

module.exports = router;