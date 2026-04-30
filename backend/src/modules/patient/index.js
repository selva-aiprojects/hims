const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const patients = await req.prisma.patient.findMany();
    res.json(patients);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const patient = await req.prisma.patient.findUnique({
      where: { id: req.params.id },
    });
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const patient = await req.prisma.patient.create({ data: req.body });
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const patient = await req.prisma.patient.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.patient.delete({ where: { id: req.params.id } });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;