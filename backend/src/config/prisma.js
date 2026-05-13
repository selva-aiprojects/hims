const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrisma() {
  if (!prisma) {
    console.log("[DB] Lazily Initializing Prisma Client with PG Adapter (SSL Bypass)...");
    
    // Clean the connection string to prevent conflicts with Pool options
    const rawUrl = process.env.DATABASE_URL || "";
    
    // Standard Vercel/Supabase connection with SSL forced to bypass
    const pool = new Pool({ 
      connectionString: rawUrl,
      ssl: {
        rejectUnauthorized: false, 
      }
    });
    
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

module.exports = {
  get prisma() { return getPrisma(); },
  getPrisma,
};