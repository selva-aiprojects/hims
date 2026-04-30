const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client initialization with PostgreSQL Adapter.
 * Required for Prisma 7.x in this environment.
 */
console.log("[DB] Initializing Prisma with PostgreSQL Adapter...");
// Safely parse and clean the URL to prevent SSL verification issues
const dbUrl = new URL(process.env.DATABASE_URL);
dbUrl.searchParams.delete('sslmode');
const connectionString = dbUrl.toString();

const pool = new Pool({ 
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false, // Bypass self-signed certificate check
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log("[DB] Prisma Client created with SSL bypass (rejectUnauthorized: false)");

function getPrisma(tenant) {
  // Return the main prisma instance
  return prisma;
}

module.exports = {
  prisma,
  getPrisma,
};