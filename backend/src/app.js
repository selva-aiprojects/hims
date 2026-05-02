const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { prisma } = require("./config/prisma");
const { audit } = require("./middleware/audit");

const app = express();

// Global BigInt Serialization Fix
BigInt.prototype.toJSON = function() { return Number(this); };

// --- FULL-SERVICE AUTO-SEED (PROVISIONS SHARDS) ---
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

async function seedSamples() {
  console.log("[SEED] Performing Full-Service CLEAN SLATE Sync...");
  const tenants = [
    { name: "City Clinic", code: "city-clinic", plan: "Basic", email: "admin@cityclinic.com" },
    { name: "Metropolis Diagnostics", code: "metro-diag", plan: "Standard", email: "admin@metrodiag.com" },
    { name: "St. Marys Hospital", code: "st-marys", plan: "Professional", email: "admin@stmarys.com" },
    { name: "NHSPL Hospital", code: "nhspl", plan: "Enterprise", email: "admin@nhspl.com" }
  ];
  
  const hashedPassword = await bcrypt.hash("Healthezee@123", 10);
  const schemaPath = path.join(__dirname, "../../database/SHARD_Base_Schema.sql");
  const baseSql = fs.readFileSync(schemaPath, "utf8");

  setTimeout(async () => {
    try {
      // 1. Check if we already have tenants. Only seed if empty.
      const tenantCountRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM nexus.tenants`);
      const tenantCount = Number(tenantCountRes[0].count);
      
      if (tenantCount > 0) {
        console.log(`[SEED] Registry already contains ${tenantCount} tenants. Skipping auto-seed to preserve manual changes.`);
        return;
      }

      console.log("[SEED] Registry is empty. Performing First-Time Clinical Setup...");

      for (const t of tenants) {
        const schemaName = t.code.replace(/-/g, '_');
        try {
          const id = crypto.randomUUID();
          
          // 2. DROP & RECREATE SHARD (Deep Wipe)
          console.log(`[SEED] Resetting Shard: ${schemaName}...`);
          await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
          await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);

          // 3. Register in Nexus
          await prisma.$executeRawUnsafe(`
            INSERT INTO nexus.tenants (id, name, code, db_name, plan)
            VALUES ('${id}', '${t.name}', '${t.code}', '${schemaName}', '${t.plan}')
          `);

          // 4. Provision Shard Schema
          const statements = baseSql.split(';').filter(s => s.trim().length > 0);
          for (let statement of statements) {
            try {
              await prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public; ${statement}`);
            } catch (e) {
              if (!e.message.includes("already exists")) {
                 console.warn(`[SEED] Statement Error in ${schemaName}: ${e.message.substring(0, 50)}`);
              }
            }
          }
          
          // 5. Create Admin User
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${schemaName}".users (name, email, password_hash, role)
            VALUES ('Hospital Admin', '${t.email}', '${hashedPassword}', 'admin')
          `);
          
          console.log(`[SEED] SUCCESS: ${t.name} is clean and live.`);
        } catch (e) {
          console.error(`[SEED] FAILED for ${t.name}:`, e.message);
        }
      }
      console.log(`[SEED] SUCCESS: All tenants are synchronized on a clean slate.`);
    } catch (e) {
      console.error("[SEED] Global Sync Failed:", e.message);
    }
  }, 3000); 
}

seedSamples();

// CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
}));

app.use(express.json());

// Attach Prisma to req globally
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check before other middleware
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/health-db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use(audit);
app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error("--- ERROR ---");
  console.error(err);
  console.error("-------------");
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    details: err.code || null
  });
});

module.exports = app;