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
    
    // Detect if we need to force the nexus schema (critical for multi-tenant registry)
    const hasNexusSchema = rawUrl.includes('schema=nexus');

    const pool = new Pool({ 
      connectionString: cleanUrl,
      ssl: {
        rejectUnauthorized: false, 
      },
      max: 10,
      // Force search path if we're connecting to the nexus registry
      options: hasNexusSchema ? "-c search_path=nexus,public" : undefined
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