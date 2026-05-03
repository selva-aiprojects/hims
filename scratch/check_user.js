const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const schema = "apollo_hospitals";
  const email = "drchakresh@mhgcl.com";
  
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".users WHERE LOWER(email) = LOWER('${email}')`);
    console.log(`User ${email} in ${schema}:`, res.length > 0 ? "FOUND" : "NOT FOUND");
  } catch (err) {
    console.error("Check failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
