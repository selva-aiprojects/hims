const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

const adapter = new PrismaPg({ connectionString: url });
const client = new PrismaClient({ adapter });

function getPrisma(tenant) {
  return client;
}

module.exports = { getPrisma };