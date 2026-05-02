const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const data = await req.prisma.$queryRawUnsafe(`
      SELECT i.*, p.name as patient_name 
      FROM "${req.schemaName}".invoices i
      JOIN "${req.schemaName}".patients p ON i.patient_id = p.id
      ORDER BY i.created_at DESC
    `);
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { patientId, encounterId, billType, items, totalAmount, paymentMode, status } = req.body;
    
    // 1. Create Invoice Header
    const subtotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    const taxTotal = items.reduce((acc, it) => acc + (it.price * it.quantity * (it.tax / 100)), 0);

    const invHeader = await req.prisma.$queryRawUnsafe(`
      INSERT INTO "${req.schemaName}".invoices (patient_id, encounter_id, bill_type, payment_mode, subtotal, tax_total, total, status)
      VALUES ('${patientId}', ${encounterId ? `'${encounterId}'` : 'NULL'}, '${billType}', '${paymentMode}', ${subtotal}, ${taxTotal}, ${totalAmount}, '${status || 'PAID'}')
      RETURNING id
    `);
    const invId = invHeader[0].id;

    // 2. Insert Items
    for (const item of items) {
      await req.prisma.$executeRawUnsafe(`
        INSERT INTO "${req.schemaName}".invoice_items (invoice_id, description, quantity, unit_price, tax_percent, amount)
        VALUES ('${invId}', '${item.description.replace(/'/g, "''")}', ${item.quantity}, ${item.price}, ${item.tax}, ${item.price * item.quantity})
      `);
    }

    res.status(201).json({ id: invId, message: "Invoice generated successfully" });
  } catch (error) { next(error); }
});

module.exports = router;