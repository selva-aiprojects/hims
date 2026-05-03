const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanup() {
  const schema = "apollo_hospitals";
  const email = "drchakresh@mhgcl.com";
  
  try {
    console.log(`Cleaning up shadow user ${email} from ${schema}...`);
    await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".users WHERE LOWER(email) = LOWER('${email}')`);
    console.log("Cleanup successful.");
  } catch (err) {
    console.error("Cleanup failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
