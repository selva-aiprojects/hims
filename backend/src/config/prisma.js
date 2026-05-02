const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrisma() {
  if (!prisma) {
    console.log("[DB] Lazily Initializing Prisma Client with PG Adapter (SSL Bypass)...");
    
    // Clean the connection string to prevent conflicts with Pool options
    const rawUrl = process.env.DATABASE_URL || "";
    const cleanUrl = rawUrl.split('?')[0]; 

    const pool = new Pool({ 
      connectionString: cleanUrl,
      ssl: {
        rejectUnauthorized: false, // Essential for Supabase/AWS managed DBs
      },
      max: 10
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