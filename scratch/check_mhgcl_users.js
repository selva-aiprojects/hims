require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { PostgreSQLAdapter } = require("@lucia-auth/adapter-postgresql"); // Wait, no, just use prisma directly
const { prisma } = require("./backend/src/config/prisma");

async function checkUser() {
  try {
    console.log("--- Checking Tenant: mhgcl ---");
    const tenant = await prisma.$queryRawUnsafe(`SELECT * FROM nexus.tenants WHERE code = 'mhgcl'`);
    console.log("Tenant info:", tenant);

    if (tenant.length > 0) {
      const users = await prisma.$queryRawUnsafe(`SELECT id, email, role FROM mhgcl.users`);
      console.log("Users in mhgcl:", users);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
