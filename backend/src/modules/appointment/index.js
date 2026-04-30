const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const appointments = await req.prisma.appointment.findMany();
    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const appointment = await req.prisma.appointment.findUnique({
      where: { id: req.params.id },
    });
    res.json(appointment);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const appointment = await req.prisma.appointment.create({
      data: req.body,
    });
    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const appointment = await req.prisma.appointment.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(appointment);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.appointment.delete({ where: { id: req.params.id } });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;