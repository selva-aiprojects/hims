const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const bills = await req.prisma.bill.findMany();
    res.json(bills);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const bill = await req.prisma.bill.findUnique({
      where: { id: req.params.id },
    });
    res.json(bill);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const bill = await req.prisma.bill.create({ data: req.body });
    res.status(201).json(bill);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const bill = await req.prisma.bill.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(bill);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.bill.delete({ where: { id: req.params.id } });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;