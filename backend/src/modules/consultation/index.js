const express = require("express");
const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { patientId, doctorId, diagnosis, notes, prescriptions } = req.body;

    const encounter = await req.prisma.encounter.create({
      data: {
        patientId,
        doctorId,
        diagnosis,
        notes,
      },
    });

    let createdPrescriptions = [];
    if (Array.isArray(prescriptions) && prescriptions.length > 0) {
      createdPrescriptions = await Promise.all(
        prescriptions.map((entry) =>
          req.prisma.prescription.create({
            data: {
              encounterId: encounter.id,
              drugName: entry.drugName,
            },
          })
        )
      );
    }

    res.status(201).json({
      encounterId: encounter.id,
      prescriptions: createdPrescriptions,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const encounters = await req.prisma.encounter.findMany();
    res.json(encounters);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const encounter = await req.prisma.encounter.findUnique({
      where: { id: req.params.id },
      include: { prescription: true },
    });
    res.json(encounter);
  } catch (error) {
    next(error);
  }
});

module.exports = router;