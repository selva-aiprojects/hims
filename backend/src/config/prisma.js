const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrisma() {
  if (!prisma) {
    console.log("[DB] Lazily Initializing Prisma Client...");
    prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

module.exports = {
  get prisma() { return getPrisma(); },
  getPrisma,
};