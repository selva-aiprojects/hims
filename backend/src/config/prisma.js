const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrisma() {
  if (!prisma) {
    console.log("[DB] Lazily Initializing Prisma Client with PG Adapter (SSL Bypass)...");
    
    // Clean the connection string to prevent conflicts with Pool options
    const rawUrl = process.env.DATABASE_URL || "";
    
    // FORCED SSL BYPASS: Required for Vercel -> Supabase/Managed DB connectivity
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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