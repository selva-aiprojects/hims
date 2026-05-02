const { PrismaClient } = require('@prisma/client');

let prisma;

try {
  console.log("[DB] Initializing Prisma Client...");
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
  console.log("[DB] Prisma Client initialized successfully.");
} catch (err) {
  console.error("[DB] Prisma Initialization Error:", err.message);
}

function getPrisma(tenant) {
  return prisma;
}

module.exports = {
  prisma,
  getPrisma,
};