const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMeds() {
  const schema = "ahpl";
  const meds = [
    { name: "Paracetamol 500mg", composition: "Paracetamol", category: "Antipyretic", price: 10 },
    { name: "Amoxicillin 250mg", composition: "Amoxicillin", category: "Antibiotic", price: 25 },
    { name: "Ibuprofen 400mg", composition: "Ibuprofen", category: "NSAID", price: 15 },
    { name: "Cetirizine 10mg", composition: "Cetirizine", category: "Antihistamine", price: 8 },
    { name: "Metformin 500mg", composition: "Metformin", category: "Antidiabetic", price: 12 },
    { name: "Amlodipine 5mg", composition: "Amlodipine", category: "Antihypertensive", price: 20 },
    { name: "Omeprazole 20mg", composition: "Omeprazole", category: "Antacid", price: 18 },
    { name: "Azithromycin 500mg", composition: "Azithromycin", category: "Antibiotic", price: 45 },
    { name: "Pantoprazole 400mg", composition: "Pantoprazole", category: "Antacid", price: 22 }
  ];

  const diagnostics = [
    { name: "Complete Blood Count (CBC)", price: 450 },
    { name: "Blood Glucose (Fasting)", price: 150 },
    { name: "Liver Function Test (LFT)", price: 850 },
    { name: "Renal Function Test (RFT)", price: 750 },
    { name: "Lipid Profile", price: 950 },
    { name: "Urine Routine", price: 250 },
    { name: "Chest X-Ray", price: 650 },
    { name: "ECG", price: 500 }
  ];

  try {
    for (const m of meds) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".medicines (name, composition, category, unit_price, is_active)
        VALUES ('${m.name}', '${m.composition}', '${m.category}', ${m.price}, true)
        ON CONFLICT DO NOTHING
      `);
    }
    for (const d of diagnostics) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".diagnostics (name, price)
        VALUES ('${d.name}', ${d.price})
        ON CONFLICT DO NOTHING
      `);
    }
    console.log("Seeding complete for", schema);
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seedMeds();
