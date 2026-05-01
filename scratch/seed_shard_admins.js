const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function seedShardAdmins() {
  const shards = [
    { code: "city-clinic", db: "hims_city_clinic", email: "admin@cityclinic.com" },
    { code: "metro-diag", db: "hims_metro_diag", email: "admin@metrodiag.com" },
    { code: "st-marys", db: "hims_st_marys", email: "admin@stmarys.com" }
  ];

  const hashedPassword = await bcrypt.hash("Healthezee@123", 10);

  for (const s of shards) {
    // Note: In this architecture, we usually use the dynamic prisma client.
    // For this seed, we assume the schemas already exist in the database.
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL + `?schema=${s.code}` } }
    });

    try {
      console.log(`Seeding Admin for Shard: ${s.code}...`);
      await prisma.$executeRawUnsafe(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('Hospital Admin', '${s.email}', '${hashedPassword}', 'admin')
        ON CONFLICT (email) DO NOTHING;
      `);
      console.log(`- Success: ${s.email} created.`);
    } catch (err) {
      console.error(`- Failed for ${s.code}:`, err.message);
    } finally {
      await prisma.$disconnect();
    }
  }
}

seedShardAdmins();
